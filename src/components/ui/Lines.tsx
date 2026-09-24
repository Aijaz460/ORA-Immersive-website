// Masked line-by-line text for reveal animations. Lines may contain <em> for the accent italic.
export default function Lines({ children }: { children: string[] }) {
  return (
    <>
      {children.map((l, i) => (
        <span className="line" key={i}>
          <span dangerouslySetInnerHTML={{ __html: l }} />
        </span>
      ))}
    </>
  );
}
