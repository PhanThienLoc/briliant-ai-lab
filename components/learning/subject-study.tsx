/** Conceptual subject drawings, never a learner score or a worked answer. */
export function SubjectStudy({ topic = "r0", compact = false }: { topic?: string; compact?: boolean }) {
  const sql = /sql|r2|queue|bfs/.test(topic);
  const math = /r1|vector|bayes|logic|probab|linear/.test(topic);
  const llm = /r4|token|attention|dense|backprop/.test(topic);
  const kind = sql ? "sql" : math ? "math" : llm ? "network" : "model";
  const label = sql ? "Từ dữ liệu đến kết quả" : math ? "Kết nối những ý tưởng" : llm ? "Nhìn vào bên trong mô hình" : "Học bằng cách thử nghiệm";
  return <div className={`subject-study study-${kind}${compact ? " study-compact" : ""}`} aria-hidden="true">
    <span className="study-label">{label}</span>
    <svg viewBox="0 0 360 218" fill="none" focusable="false">
      {sql ? <>
        <g className="study-lines"><rect x="25" y="38" width="112" height="115" rx="9" /><path d="M25 67h112M25 95h112M25 123h112M62 38v115M100 38v115" /></g>
        <rect x="26" y="68" width="110" height="26" className="study-fill" /><rect x="26" y="124" width="110" height="28" rx="2" className="study-fill" />
        <path d="M151 96h48m-8-7 8 7-8 7" className="study-connector" />
        <g className="study-lines"><rect x="217" y="66" width="115" height="60" rx="9" /><path d="M217 96h115M255 66v60M293 66v60" /></g>
        <text x="79" y="184" textAnchor="middle">Bảng nguồn</text><text x="274" y="157" textAnchor="middle">Lọc · kết hợp · tổng hợp</text>
      </> : math ? <>
        <g className="study-grid"><path d="M45 40v142m42-142v142m42-142v142m42-142v142m42-142v142m42-142v142m42-142v142M45 40h252M45 82h252M45 124h252M45 166h252" /></g>
        <path d="M45 182V25m0 157h272" className="study-lines" />
        <path d="m45 166 167-88-9 22m9-22-23-2" className="study-vector" /><path d="m45 166 80-112-1 24m1-24-22 9" className="study-connector" />
        <path d="m125 54 88 24 84 88H45" strokeDasharray="5 6" className="study-lines" />
        <circle cx="45" cy="166" r="5" className="study-dot" /><text x="227" y="70">v</text><text x="132" y="44">u</text><text x="53" y="206">Một ý tưởng, nhiều cách biểu diễn</text>
      </> : <>
        <g className="study-lines">{[61,109,157].map((y) => <path key={y} d={`M57 ${y} 154 61M57 ${y} 154 109M57 ${y} 154 157M154 ${y} 260 85M154 ${y} 260 133`} />)}</g>
        {[61,109,157].map((y) => <g key={y}><circle cx="57" cy={y} r="13" className="study-node" /><circle cx="154" cy={y} r="16" className="study-node study-node-filled" /></g>)}
        {[85,133].map((y) => <circle key={y} cx="260" cy={y} r="19" className="study-node" />)}
        <path d="M283 109h43m-8-7 8 7-8 7" className="study-connector" />
        <text x="57" y="201" textAnchor="middle">Dữ liệu</text><text x="154" y="201" textAnchor="middle">Biểu diễn</text><text x="274" y="201" textAnchor="middle">Dự đoán</text>
      </>}
    </svg>
    {!compact && <span className="study-footnote">Sơ đồ khái niệm · không phải đáp án bài học</span>}
  </div>;
}
