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

type GraphResponse = {
  data?: GraphMediaItem[];
  error?: { message: string; code?: number; type?: string };
};

const isDev = process.env.NODE_ENV === "development";

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

export async function getInstagramFeed(limit = 4): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  if (!token || !userId) {
    if (isDev) {
      console.warn(
        "[getInstagramFeed] .env.local içinde eksik:",
        !token ? "INSTAGRAM_ACCESS_TOKEN " : "",
        !userId ? "INSTAGRAM_USER_ID" : "",
      );
    }
    return [];
  }

  // Facebook Login + IG iş hesabı → graph.facebook.com (graph.instagram.com Business Login içindir)
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v21.0";
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${userId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}",
  );
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 12)));
  url.searchParams.set("access_token", token);

  const revalidateSeconds = Math.max(60, Number(process.env.INSTAGRAM_FEED_REVALIDATE_SECONDS ?? 300));

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    const json = (await res.json()) as GraphResponse;
    if (!res.ok || json.error) {
      if (isDev) {
        if (json.error) {
          console.warn(
            "[getInstagramFeed] Graph API:",
            json.error.message,
            json.error.code != null ? `(#${json.error.code})` : "",
          );
        } else {
          console.warn("[getInstagramFeed] HTTP", res.status, res.statusText);
        }
      }
      return [];
    }
    const rows = json.data ?? [];

    const posts = rows
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
      .filter((x): x is InstagramPost => Boolean(x));

    if (isDev && posts.length === 0) {
      if (rows.length === 0) {
        console.warn(
          "[getInstagramFeed] API başarılı ama gönderi yok: INSTAGRAM_USER_ID = instagram_business_account.id olmalı (sayfa ID değil). Token sayfa erişimi içermeli.",
        );
      } else {
        console.warn(
          "[getInstagramFeed] Yanıtta",
          rows.length,
          "kayıt vardı; görsel veya permalink eksik olduğu için listelenmedi.",
        );
      }
    }

    return posts.slice(0, limit);
  } catch (e) {
    if (isDev) {
      console.warn("[getInstagramFeed] İstek hatası:", e instanceof Error ? e.message : e);
    }
    return [];
  }
}

