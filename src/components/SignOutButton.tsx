export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium hover:bg-page">
        Log out
      </button>
    </form>
  );
}
