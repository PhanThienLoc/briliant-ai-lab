"use client";

import "../../app/library-studio.css";
import { useState } from "react";
import { filterSourceCourses, sourceCourseProgress } from "../../lib/course-library";
import type { SourceCourse, SourceKind } from "../../lib/source-course";
import { expansionLabs, expansionTracks, type ExpansionLabId } from "../../lib/expansion-catalog";
import { lessonCatalog } from "../../lib/lesson-catalog";

export const sourceKindLabels: Record<SourceKind, string> = { video: "Video / transcript", paper: "Bài báo khoa học", book: "Sách / chương sách", article: "Bài viết" };

// Line studies identify the subject even without color.
const trackStudies: Record<string, string> = {
  r0: "M14 50h26V38h26V26h26V14h26",
  r1: "M20 50V10m0 40h90M20 50l55-32m-18 1 18-1-8 15",
  r2: "M8 12h40v36H8zM8 24h40m-20-12v36m44-32h40v36H72zM72 28h40m-20-12v36M48 33h24",
  r3: "M12 52V8m0 44h101M19 44l84-29M29 37h4m8-7h4m4 6h4m9-13h4m8 4h4m12-14h4",
  r4: "M19 16l41-5-41 35 41-16-41-14 41 35-41-5m41-35 43 19-43 21m-1-21h44",
};

function SubjectCover({ kind, label }: { kind: string; label: string }) {
  return <div className={`library-cover cover-${kind}`}><span>{label}</span>
    {trackStudies[kind] && <svg aria-hidden="true" viewBox="0 0 124 62" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"><path d={trackStudies[kind]} /></svg>}
  </div>;
}

type LibraryProps = {
  courses: SourceCourse[]; now: number; hydrated: boolean; storageError: string;
  onOpen: (course: SourceCourse, index: number) => void; onRemove: (course: SourceCourse) => void;
  onCreate?: () => void; onLesson?: (id: string) => void; onTrack?: (id: ExpansionLabId) => void;
};

export function CourseLibrary({ courses, now, hydrated, storageError, onOpen, onRemove, onCreate, onLesson, onTrack }: LibraryProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SourceKind | "all">("all");
  const filtered = filterSourceCourses(courses, query, kind);
  return <div className="course-library">
    <section aria-labelledby="saved-library-title">
      <div className="library-section-title"><div><h2 id="saved-library-title">Nguồn của tôi</h2><p>Các khóa học lưu trên thiết bị này{hydrated && !storageError ? ` · ${courses.length} khóa` : ""}.</p></div>{onCreate && courses.length > 0 ? <button className="studio-button" onClick={onCreate}>+ Tạo khóa học</button> : null}</div>
      {courses.length > 0 && <div className="library-filters"><label>Tìm khóa học hoặc tên nguồn<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong nguồn đã lưu…" /></label><label>Loại nguồn<select value={kind} onChange={(event) => setKind(event.target.value as SourceKind | "all")}><option value="all">Tất cả nguồn</option>{Object.entries(sourceKindLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>}
      {!hydrated ? <p className="library-state" role="status">Đang mở thư viện trên thiết bị…</p> : storageError ? <p className="library-state" role="alert">{storageError}</p> : !courses.length ? <div className="library-state"><h3>Tạo khóa học đầu tiên từ tài liệu của ông.</h3><p>Thêm một chương sách, bài viết hoặc transcript. Ông sẽ duyệt từng bài trước khi lưu.</p>{onCreate ? <button className="studio-extract" onClick={onCreate}>Tạo khóa học đầu tiên →</button> : null}</div> : !filtered.length ? <div className="library-state" role="status"><h3>Chưa tìm thấy khóa phù hợp.</h3><p>Thử tên nguồn khác hoặc bỏ bộ lọc.</p><button className="studio-extract" onClick={() => { setQuery(""); setKind("all"); }}>Xóa bộ lọc</button></div> : <><p className="library-result-count" role="status">{filtered.length} khóa phù hợp</p><div className="library-grid">{filtered.map((course) => {
        const progress = sourceCourseProgress(course);
        const due = course.lessons.findIndex((lesson) => lesson.completedAt && lesson.reviewDueAt && !lesson.reviewedAt && Date.parse(lesson.reviewDueAt) <= now);
        const next = course.lessons.findIndex((lesson) => !lesson.completedAt);
        const index = due >= 0 ? due : Math.max(next, 0);
        const action = due >= 0 ? "Ôn bài đến hạn" : next < 0 ? "Xem lại khóa học" : progress.completed ? "Tiếp tục học" : "Bắt đầu học";
        return <article className="library-card saved-course-card" key={course.id}><SubjectCover kind={course.kind} label={sourceKindLabels[course.kind]} /><div className="library-card-body"><h3>{course.title}</h3><p className="library-provenance">Nguồn: {course.sourceName}</p><p>{progress.completed}/{progress.total} bài đã học{due >= 0 ? " · Đến hạn ôn" : ""}</p><progress max={progress.total} value={progress.completed} aria-label={`${course.title}: ${progress.completed}/${progress.total} bài đã học`} /><div className="library-card-actions"><button className="studio-button" aria-label={`${action}: ${course.title}`} onClick={() => onOpen(course, index)}>{action} →</button><button className="library-remove" onClick={() => onRemove(course)} aria-label={`Xóa khóa học ${course.title}`}>Xóa</button></div></div></article>;
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
