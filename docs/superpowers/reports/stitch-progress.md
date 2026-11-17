# SDD ledger — plan: docs/superpowers/plans/2026-11-15-stitch-ui.md

User approved exact Stitch design and implementation. Existing Site appgprj_6a8dd820e52081919d727df8547eeab7, URL unchanged, custom audience, livev33 baseline d75b434ecabc808f418fd5244d0de10010add65c. Worktree branch feat/stitch-ui. Spec/plan restored at1beba56.

## Recovery

Browser filechooser call hung and was user-aborted after6801s. During inactivity the previous checkout, all local feature commits/reports, agent sessions and browser tabs were pruned. Remote stillv33/d75b434. Scratch root archives and shared reference screenshots survived. Old implementation62fab20 Task1 and6a69c4e Task2 are not present: never claim those changes remain or redeploy their old artifacts. Reimplement against approved exact contract and verify again.

Ruling: Restore approved spec/plan and continue without another approval — user already approved this exact migration — reversible local rework costs time, not new scope.
Ruling: No more filechooser testing in this run — supported call hung despite10s chooser deadline — use actual paste-text source workflow and disclose file-input browser verification limit.
Ruling: Take Git bundle checkpoint outside /workspace/sites after each local commit, then source-helper save-only after each tested task — avoid another site-workspace cleanup losing work — increases saved version numbers, preserves live deployment until final.
Ruling: Continuous execution through local commits/source push/save/deploy remains authorized by approved Site migration and standing Sites instructions — no redundant conversational gate.

## Preflight

| Tasks | Shared boundary | Resolution |
|---|---|---|
|1/2|View+SourceStudio|Task1 working shared component; Task2 explicit mode contract, sequential|
|1/3|Dashboard+theme|Task3 moves existing runtime, no cloned engine, sequential|
|2/3|Source reader and review routes|Preserve exact target props and single storage owner|
|1|Legacy styles after theme changes|Named child contrast and explicit prose sizing are binding recovery requirements|

Baseline unchanged code previously passed build+144/144; evidence /workspace/scratch/8052a705d640/stitch-baseline.log. Existing standalone tsc15 diagnostics previously normalized against pristine baseline: nine expansion implicit-any, three dashboard outcome/never[]/state comparison, three missing Cloudflare ambient types. No optional tsc reruns; report warnings honestly. Dependencies restoring.

Task1 pending; Task2 pending; Task3 pending; final review/browserQA/publication pending.

Task1 implementation e4755f7:146/146 + lint, final focused25/25. Reviewer /root/stitch_shell_recovery_review running. Root source-helper fresh production build/push completed at18d1f5d265d1b93b9c1412e4e1625b5723753eb1 (documentation checkpoint added). Saved-only Sitev34, id appgprj_6a8dd820e52081919d727df8547eeab7~appgver_f94825082af88191ba8b32042dc17731. Live stillv33; no deployment yet. Reports/plan are in remote Git; local bundle /workspace/scratch/8052a705d640/stitch-task1.bundle. Package /workspace/scratch/8052a705d640/brilliantai-stitch-task1.tar.gz. This is a durable recovery point before browser QA.

Task1 review requires2 CSS fixes: derivative span white/pale and hint-ladder prose14px. Original implementer resumed round1. Environment proxy warnings/content human read-through are deferred minor; no application regression inferred. Browser desktop confirms persisted real70H pending vector review88%, no page overflow, Help opens/Esc returns focus to persistent tool disclosure, review honest due0. 390px actual app iframe: scrollWidth375/viewport390, four nav buttons78px high, secondary tools accessible. Temporary QA wrapper and exclude line removed immediately. Service id/URL/custom policy confirmed through get_site, no audience mutation. Unchanged engines/schema checked via regression and immutable diff; source/Workspace runtime checks are later-task acceptance.

Task1: fix round1/5 (2 addressed,0 open — derivative contrast and hint prose; commits e4755f7..676fcc5), scoped rereview clean. Task1: complete (commits1beba56..7cc6856, review clean). Fresh source-helper production build/push after CSS fix at7cc6856844d09f836422196cccdd7a87a33cb3a8. Task2 now starts from this reviewed and durable source. No unresolved load-bearing issue; baseline environment caveats remain final-review minor.

Browser computed descendants verified in actual R4 instruments: dense result label/output ink23/36/29 on234/245/233,14px; derivative ∂L/∂w and formula muted82/98/88 on237/243/250,14px; RAW TEXT ink23/36/29 onwhite. Completed Dense with keyboard ranges, then legitimate bridge; successful transfer feedback remains until explicit Continue, Backprop opens after edge evidence. Range fill did not dispatch React updates in automation, keyboard works. Do not report fill artifact as app bug. New real Dense practice/72h review persisted. Task2 running /root/stitch_library_recovery from7cc6856.

Task2 98947286c417216d89988414b08197b74ec4e744:150/150 full tests+build,19 focused, scoped lint. Task review /root/stitch_library_recovery_review approved spec+quality, no blockers. Minor baseline proxy warnings retained.

Task2 browser: pasted1053char Markdown with3 sections, edited course/lesson title and objective. Save disabled at1 selected, enabled2. Draft survived Library→Create; explicit save produced actual2-lesson course. Accentless uppercase search matched, book-kind intersection produced honest no-results, all-kind restored. Source wrong then correct answers yielded1/2 completed; same-view Library reset reader; reload retained edited title/source/excerpts/objective and1/2 progress. Review shows actual source pending72H, opens exact first source lesson, Root backÔn tập correct. No early review/evidence grant. Mobile390 actual iframe: scrollWidth375, source excerpt16px, search51px/select45px, no visible button/summary below44px, draft checkbox labels44px with20px native box. Create/draft also no overflow. Service/audience remain same; no extra dependencies. All static cannot-verify items resolved by these checks and Task1 evidence.

Task2: complete (commits7cc6856..9894728, review clean). Task3 pending source-helper checkpoint. Task2 minor (carry to Task3 presentation): opening source reader unmounts trigger and leaves focus on BODY; controls remain reachable, but focus its heading for better keyboard context. SourceReader layout belongs to Task3, no engine change needed.

Browser final acceptance: real Home/secondary menus; Library search/filter/empty; paste>400char text, preview>=2 drafts, edit/save/open/reload; prediction wrong/right and hint evidence, Python; correct back origin; real72h review/empty and source targets;390px no overflow and controls; Help/History Esc focus; error logs; final Home/Workspace screenshots. Existing old QA proved runtime behavior before cleanup, but new implementation must be checked.

Reference screenshot /workspace/shared/brilliantai-stitch/workspace-final-preview.jpg. Not implementation screenshot. Shared synthetic text fixture huong-dan-hoc-qa.md, no user private material.

## Resume after automated maintenance, 2026-11-15

Restored existing stitch-task3.bundle directly, no implementation repeated. Current checkout /workspace/sites/brilliantai-stitch-final, isolated feat/stitch-ui HEADb28fd6e556333b4470a985a12e13129f8350950a. Source helper opened same Site, remote checkpoint f1f7606 saved-onlyv36, production stillv33, custom audience unchanged. No needed source was lost: all three tasks and fixes are in this bundle.

Historical Task3 gate: bb2b1ee implements focused Workspace/Review;150/150 tests+build and lint passed. Static reviewer /root/stitch_workspace_review approved spec and quality. Controller found2 real visual/interaction gaps: sample-grid703x703 and Next leaving BODY focus/scrollY878. Original implementer fixed both in0b694db andb28fd6e, covering design/navigation7/7, scoped lint+fresh build passed. Scoped reviewer /root/stitch_workspace_rereview found both ADDRESSED, no new breakage.

Historical browser GREEN on exactb28: desktop grid138px/mobile200px with all100 cells; no global rail or overflow in focused view; all visible controls>=44px; outline/support native details collapsed at390 and keyboard-toggleable (summary55px); correct/incorrect prediction and hint evidence; Next focusesH2 visible top24px, slider retainsINPUT focus and hint retainsBUTTON focus. Source reader open focusesH3 and close focusesLibraryH1. One ConceptInstrument instance. Vector independent Python retry succeeds and completion says code verified without help; fresh72h review remains required. Earlier source save/edit/search/filter/open/reload and1/2 progress checks are recorded above and remain valid for unchanged source.

Task3: fix round1/5 (2 addressed,0 open — bounded sample and transition focus; commitsbb2b1ee..b28fd6e, review clean).
Task3: complete (commitsf1f7606..b28fd6e, review clean).

All implementation tasks complete. Fresh final build/tests/lint, whole-branch review from original baselined75b434 (not remote f1), SQL/mobile smoke, error-log check and final screenshots/publication pending. Prior agent report/review files forTask3 were pruned; source and the recorded historical verdicts above are intact. Do not present reconstructed historical notes as fresh test output. Final reviewer gets fresh verification evidence plus immutable full diff.

Fresh final gates on restored b28 runtime: npmtest150/150+production build and lint exit0; diffcheck clean. Whole-branch review /root/stitch_final_branch_review running on d75..cc44a69. Fresh SQL browser: starter query missing amount condition passes1/3 adversarial datasets and is rejected; adding amount>=180 passes3/3 and records practice, prerequisite still requires bridge. At390px actual iframe SQL tables have414px inside305px overflow:auto container, html375px/viewport390 (no page overflow). Temporary wrapper/exclude removed immediately; live iframe remains for final QA. Home screenshot saved app-home-final.jpg. Current remaining UI review concerns are being finalized, no speculative fix dispatched.

Whole-branch review complete: With fixes. I1 SourceReviews read-error semantics, I2 remaining instructional prose14px, M1 stale direct/history Tracks origin, M2 interim docs. Preliminary button-size concern was retracted by reviewer after finding retained .app-shell button44 rule; not a finding. Single final fix wave dispatched with all4 findings; no second broad review or one-fixer-per-finding.

Declined-to-judge adjudication: final geometry/focus/screenshots and publication remain controller responsibilities; manual filechooser remains excluded after hang (paste+engine regression cover available paths); human content audit is separate and explicitly pending; baseline npm/proxy/Vinext/15 tsc diagnostics are disclosed pre-existing conditions; unrelated repository security/performance/engine refactoring stays outside approved UI scope. None is silently claimed complete.

Final fix wave42f7baf: storage RED4/9→GREEN9/9, full154/154+production build+lint; scoped rereview addresses I1/M1/M2, no new breakage, leaves I2 only for Code Coach small footer. Browser exact M1 GREEN now returnsHome after stale Library-origin sequence. Computed wrong/correct feedback and explanation-coach paragraphs16px, algorithm list16px; queue-status note and Code Coach assistance/mastery footnote14px.

Ruling: Classify the Code Coach small assistance/mastery disclosure as14px status metadata, not primary teaching prose — approved contract permits14px metadata and the rendered footnote has readable muted ink onwhite, while actual algorithm/feedback instructions now16px — if wrong, one supporting footnote is2px smaller than desired; redundant16px footer declaration remains deferred CSS cleanup, no learning or data risk. This is the final-wave residual I2 adjudication; reviewer disagreement is preserved in final-fix-review.md. No second fix wave.
Ruling: Execute the already-approved existing-Site publication instead of asking the integration menu again — user approved this exact migration and standing Sites workflow includes source push/save/deploy — if wrong, revert to the preceding saved Site version; audience stays custom. Keep isolated local branch/bundle as recovery evidence.
