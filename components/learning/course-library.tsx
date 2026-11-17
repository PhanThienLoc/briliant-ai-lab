"use client";

import { useState } from "react";
import { filterSourceCourses, sourceCourseProgress } from "../../lib/course-library";
import type { SourceCourse, SourceKind } from "../../lib/source-course";
import { expansionLabs, expansionTracks, type ExpansionLabId } from "../../lib/expansion-catalog";
import { lessonCatalog } from "../../lib/lesson-catalog";

export const sourceKindLabels: Record<SourceKind, string> = { video: "Video / transcript", paper: "Bài báo khoa học", book: "Sách / chương sách", article: "Bài viết" };

function SubjectCover({ kind, label }: { kind: string; label: string }) {
  return <div className={`library-cover cover-${kind}`} aria-hidden="true"><span>{label}</span><svg viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 75h160M35 85V20M35 65l35-25 30 13 55-33" /><circle cx="70" cy="40" r="5" /><circle cx="100" cy="53" r="5" /><circle cx="155" cy="20" r="5" /><path d={kind === "video" ? "M140 65l20 10-20 10V65Z" : "M130 65h40v20h-40zM150 65v20"} /></svg></div>;
}

type LibraryProps = {
  courses: SourceCourse[]; hydrated: boolean; storageError: string;
  onOpen: (course: SourceCourse) => void; onRemove: (course: SourceCourse) => void;
  onCreate?: () => void; onLesson?: (id: string) => void; onTrack?: (id: ExpansionLabId) => void;
};

export function CourseLibrary({ courses, hydrated, storageError, onOpen, onRemove, onCreate, onLesson, onTrack }: LibraryProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SourceKind | "all">("all");
  const filtered = filterSourceCourses(courses, query, kind);
  return <div className="course-library">
    <section aria-labelledby="saved-library-title">
      <div className="library-section-title"><div><h2 id="saved-library-title">Nguồn của tôi</h2><p>Các khóa học lưu trên thiết bị này{hydrated && !storageError ? ` · ${courses.length} khóa` : ""}.</p></div>{onCreate ? <button className="studio-button" onClick={onCreate}>+ Tạo khóa học</button> : null}</div>
      <div className="library-filters"><label>Tìm khóa học hoặc tên nguồn<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong nguồn đã lưu…" /></label><label>Loại nguồn<select value={kind} onChange={(event) => setKind(event.target.value as SourceKind | "all")}><option value="all">Tất cả nguồn</option>{Object.entries(sourceKindLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
      {!hydrated ? <p className="library-state" role="status">Đang mở thư viện trên thiết bị…</p> : storageError ? <p className="library-state" role="alert">{storageError}</p> : !courses.length ? <div className="library-state"><h3>Chỗ cho ý tưởng tiếp theo của ông.</h3><p>Thêm một chương sách, bài viết hoặc transcript. Ông sẽ duyệt từng bài trước khi lưu.</p>{onCreate ? <button className="studio-extract" onClick={onCreate}>Tạo khóa học đầu tiên →</button> : null}</div> : !filtered.length ? <div className="library-state" role="status"><h3>Chưa tìm thấy khóa phù hợp.</h3><p>Thử tên nguồn khác hoặc bỏ bộ lọc.</p><button className="studio-extract" onClick={() => { setQuery(""); setKind("all"); }}>Xóa bộ lọc</button></div> : <><p className="library-result-count" role="status">{filtered.length} khóa phù hợp</p><div className="library-grid">{filtered.map((course) => {
        const progress = sourceCourseProgress(course);
        return <article className="library-card" key={course.id}><SubjectCover kind={course.kind} label={sourceKindLabels[course.kind]} /><div className="library-card-body"><h3>{course.title}</h3><p className="library-provenance">Nguồn: {course.sourceName}</p><p>{progress.total} bài · {progress.completed} bài đã học</p><progress max={progress.total} value={progress.completed} aria-label={`${course.title}: ${progress.completed}/${progress.total} bài đã học`} /><div className="library-card-actions"><button className="studio-button" onClick={() => onOpen(course)}>Mở khóa học →</button><button className="library-remove" onClick={() => onRemove(course)} aria-label={`Xóa khóa học ${course.title}`}>Xóa</button></div></div></article>;
      })}</div></>}
    </section>
    <section className="curated-library" aria-labelledby="curated-library-title"><div className="library-section-title"><div><h2 id="curated-library-title">Lộ trình nền tảng AI & Data</h2><p>Bài học có sẵn · thực hành, dẫn chứng và điều kiện mở bài theo từng lộ trình.</p></div></div><div className="library-grid curated-grid">
      <article className="library-card"><SubjectCover kind="r0" label="R0 · Nền tảng" /><div className="library-card-body"><h3>{lessonCatalog.course.title}</h3><p>{lessonCatalog.course.description}</p><p>{lessonCatalog.lessons.length} bài trong danh mục</p><details><summary>Xem các bài R0</summary><ul>{lessonCatalog.lessons.map((lesson) => <li key={lesson.id}><button disabled={!onLesson} onClick={() => onLesson?.(lesson.id)}>{lesson.title} →</button></li>)}</ul></details></div></article>
      {expansionTracks.map((track) => {
        const labs = expansionLabs.filter((lab) => lab.trackId === track.id);
        return <article className="library-card" key={track.id}><SubjectCover kind={track.release.toLowerCase()} label={`${track.release} · Lộ trình`} /><div className="library-card-body"><h3>{track.title}</h3><p>{track.description}</p><p>{labs.length} bài trong danh mục</p><details><summary>Xem các bài {track.release}</summary><ul>{labs.map((lab) => <li key={lab.id}><button disabled={!onTrack} onClick={() => onTrack?.(lab.id)}>{lab.index} · {lab.title} →</button></li>)}</ul></details></div></article>;
      })}
    </div></section>
  </div>;
}
