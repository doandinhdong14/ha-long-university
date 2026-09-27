export function TrangTieuDe({ tieuDe, moTa, children }: { tieuDe: string; moTa?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{tieuDe}</h1>
        {moTa && <div className="mt-1 text-sm text-muted-foreground">{moTa}</div>}
      </div>
      {children}
    </div>
  );
}
