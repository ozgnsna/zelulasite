const SIGN_OUT_ACTION = "/auth/signout";

export function SignOutForm() {
  return (
    <div className="mt-10 border-t border-[#e8dfd3]/70 pt-8">
      <form action={SIGN_OUT_ACTION} method="post" className="flex justify-center sm:justify-start">
        <button
          type="submit"
          className="text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
        >
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
