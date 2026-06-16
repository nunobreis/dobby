export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-[3px] border-accent/20 border-t-accent animate-spin" />
    </div>
  );
}
