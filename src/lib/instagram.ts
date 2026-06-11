import { unstable_cache } from "next/cache";

export type InstagramPost = {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
  timestamp: string | undefined;
};

type GraphMediaChild = {
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
};

type GraphMediaItem = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
  children?: { data?: GraphMediaChild[] };
};

type GraphError = {
  message: string;
  code?: number;
  type?: string;
  error_subcode?: number;
};

type GraphResponse = {
  data?: GraphMediaItem[];
  error?: GraphError;
};

/** Varsayılan: 30 dk — media_url geçici olduğu için uzun önbellek kırık görsellere yol açar. */
const DEFAULT_REVALIDATE_SECONDS = 1800;

const isDev = process.env.NODE_ENV === "development";

function getRevalidateSeconds(): number {
  const raw = process.env.INSTAGRAM_FEED_REVALIDATE_SECONDS?.trim();
  const parsed = raw ? Number(raw) : DEFAULT_REVALIDATE_SECONDS;
  if (!Number.isFinite(parsed) || parsed < 60) return DEFAULT_REVALIDATE_SECONDS;
  return Math.floor(parsed);
}

function isRealtimeFeed(): boolean {
  return String(process.env.INSTAGRAM_FEED_REALTIME ?? "").trim().toLowerCase() === "true";
}

/** Yalnızca sunucu .env — istemciye sızmaz. */
export function getInstagramCredentials(): {
  token: string;
  userId: string;
  tokenEnvKey: "INSTAGRAM_ACCESS_TOKEN";
  userIdEnvKey: "INSTAGRAM_USER_ID";
} {
  return {
    token: process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ?? "",
    userId: process.env.INSTAGRAM_USER_ID?.trim() ?? "",
    tokenEnvKey: "INSTAGRAM_ACCESS_TOKEN",
    userIdEnvKey: "INSTAGRAM_USER_ID",
  };
}

function logInstagramIssue(
  level: "warn" | "info",
  message: string,
  extra?: Record<string, string | number | boolean | undefined>,
) {
  const payload = { ...extra };
  if (level === "warn") {
    console.warn(`[instagram-feed] ${message}`, Object.keys(payload).length ? payload : "");
  } else if (isDev) {
    console.info(`[instagram-feed] ${message}`, Object.keys(payload).length ? payload : "");
  }
}

function classifyGraphError(error: GraphError | undefined): string {
  if (!error) return "unknown";
  const code = error.code;
  if (code === 190 || error.error_subcode === 463) return "token_invalid_or_expired";
  if (code === 102) return "token_missing_or_invalid";
  if (code === 4 || code === 17 || code === 32 || code === 80002) return "rate_limit";
  if (code === 100) return "invalid_parameter";
  return "api_error";
}

function pickImageUrl(row: GraphMediaItem): string | undefined {
  if (row.media_type === "VIDEO") {
    return row.thumbnail_url ?? row.media_url;
  }
  if (row.media_type === "CAROUSEL_ALBUM") {
    const first = row.children?.data?.[0];
    if (first) {
      if (first.media_type === "VIDEO") {
        return first.thumbnail_url ?? first.media_url;
      }
      return first.media_url ?? first.thumbnail_url;
    }
  }
  return row.media_url ?? row.thumbnail_url;
}

function buildMediaUrl(userId: string, token: string, limit: number): string {
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${userId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}",
  );
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 12)));
  url.searchParams.set("access_token", token);
  return url.toString();
}

function rowsToPosts(rows: GraphMediaItem[], limit: number): InstagramPost[] {
  return rows
    .map((row) => {
      const imageUrl = pickImageUrl(row);
      if (!row.id || !imageUrl || !row.permalink) return null;
      return {
        id: row.id,
        imageUrl,
        permalink: row.permalink,
        caption: row.caption ?? "Zelula Instagram paylaşımı",
        timestamp: row.timestamp,
      } satisfies InstagramPost;
    })
    .filter((x): x is InstagramPost => Boolean(x))
    .slice(0, limit);
}

/**
 * Tek Graph API isteği (/media).
 * @returns null = API/ağ hatası (önbelleğe yazılmaz); [] = yanıt başarılı, listelenecek gönderi yok.
 */
async function fetchInstagramFeedFromGraph(
  limit: number,
  revalidateSeconds: number,
): Promise<InstagramPost[] | null> {
  const { token, userId, tokenEnvKey, userIdEnvKey } = getInstagramCredentials();

  if (!token || !userId) {
    if (isDev) {
      logInstagramIssue("warn", "Eksik ortam değişkeni", {
        missingToken: !token,
        missingUserId: !userId,
        expectedTokenVar: tokenEnvKey,
        expectedUserIdVar: userIdEnvKey,
      });
    }
    return [];
  }

  const url = buildMediaUrl(userId, token, limit);

  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateSeconds, tags: ["instagram-feed"] },
      headers: { Accept: "application/json" },
    });
    const json = (await res.json()) as GraphResponse;

    if (!res.ok || json.error) {
      const kind = classifyGraphError(json.error);
      logInstagramIssue("warn", "Graph API yanıtı başarısız", {
        kind,
        httpStatus: res.status,
        code: json.error?.code,
        subcode: json.error?.error_subcode,
        message: json.error?.message?.slice(0, 200),
        tokenSource: tokenEnvKey,
        userIdConfigured: Boolean(userId),
      });
      if (kind === "token_invalid_or_expired" || kind === "token_missing_or_invalid") {
        logInstagramIssue(
          "warn",
          "INSTAGRAM_ACCESS_TOKEN geçersiz veya süresi dolmuş olabilir; Meta panelinden uzun ömürlü token yenileyin.",
        );
      }
      if (kind === "rate_limit") {
        logInstagramIssue(
          "warn",
          "Rate limit — önbellek süresi sonunda tekrar denenecek. INSTAGRAM_FEED_REALTIME=true açmayın.",
        );
      }
      return null;
    }

    const rows = json.data ?? [];
    const posts = rowsToPosts(rows, limit);

    if (isDev && posts.length === 0) {
      if (rows.length === 0) {
        logInstagramIssue(
          "warn",
          "API başarılı ama gönderi yok; INSTAGRAM_USER_ID = instagram_business_account.id olmalı.",
        );
      } else {
        logInstagramIssue("warn", "Kayıtlar var ancak görsel/permalink eksik", { rowCount: rows.length });
      }
    }

    return posts;
  } catch (e) {
    logInstagramIssue("warn", "İstek hatası", {
      message: e instanceof Error ? e.message.slice(0, 200) : "unknown",
    });
    return null;
  }
}

async function loadInstagramFeedCached(limit: number): Promise<InstagramPost[]> {
  const revalidateSeconds = getRevalidateSeconds();

  try {
    return await unstable_cache(
      async (bounded: number, rev: number) => {
        const posts = await fetchInstagramFeedFromGraph(bounded, rev);
        if (posts === null) {
          throw new Error("instagram_fetch_failed");
        }
        return posts;
      },
      ["instagram-feed", String(limit), String(revalidateSeconds)],
      { revalidate: revalidateSeconds, tags: ["instagram-feed"] },
    )(limit, revalidateSeconds);
  } catch {
    return [];
  }
}

/** Ana sayfa Instagram akışı — önbellekli (varsayılan 1 saat). */
export async function getInstagramFeed(limit = 4): Promise<InstagramPost[]> {
  const bounded = Math.min(Math.max(limit, 1), 12);

  if (isRealtimeFeed()) {
    if (isDev) {
      logInstagramIssue("warn", "INSTAGRAM_FEED_REALTIME=true — önbellek kapalı, her istekte Graph API çağrılır.");
    }
    const posts = await fetchInstagramFeedFromGraph(bounded, 60);
    return posts ?? [];
  }

  return loadInstagramFeedCached(bounded);
}
