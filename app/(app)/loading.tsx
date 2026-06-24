export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-4" aria-busy="true" aria-label="Učitavanje">
      <div className="skeleton h-9 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
      <div className="skeleton h-24 w-full mt-2" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-32 w-full" />
    </div>
  )
}
