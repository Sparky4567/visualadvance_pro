use std::{
    env, fs,
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use tauri::{Manager, State};

struct BiosConfig {
    root: Option<PathBuf>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BiosResult {
    file_name: String,
    url: String,
}

#[tauri::command]
fn find_bios(
    core: String,
    candidates: Vec<String>,
    config: State<'_, BiosConfig>,
) -> Option<BiosResult> {
    let root = config.root.as_ref()?;

    for file_name in candidates {
        if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
            continue;
        }

        let path = root.join(&file_name);

        if !is_inside(root, &path) || !path.is_file() {
            continue;
        }

        let bytes = match fs::read(&path) {
            Ok(bytes) => bytes,
            Err(_) => continue,
        };
        let url = format!(
            "data:application/octet-stream;base64,{}",
            STANDARD.encode(bytes)
        );

        println!("Using BIOS {file_name} for {core}");

        return Some(BiosResult { file_name, url });
    }

    None
}

fn is_inside(root: &Path, path: &Path) -> bool {
    let Ok(root) = root.canonicalize() else {
        return false;
    };
    let Ok(path) = path.canonicalize() else {
        return false;
    };

    path.starts_with(root)
}

pub fn run() {
    let bios_root = env::var("VISUALADVANCE_BIOS_PATH")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from);

    tauri::Builder::default()
        .manage(BiosConfig { root: bios_root })
        .setup(|app| {
            if let Some(root) = &app.state::<BiosConfig>().root {
                println!("Using external BIOS directory: {}", root.display());
            } else {
                println!("VISUALADVANCE_BIOS_PATH is not set; falling back to web BIOS URLs");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![find_bios])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
