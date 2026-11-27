// Feasibility shell: no application commands, plugins, or external API access.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("BrilliantAI feasibility shell failed to start");
}
