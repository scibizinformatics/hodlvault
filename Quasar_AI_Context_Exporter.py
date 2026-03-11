import os
import json
import datetime

# --- CONFIGURATION ---
# Folders to completely ignore
IGNORE_DIRS = {'.git', 'node_modules', '.quasar', 'dist', 'node_modules', '.vscode', 'public'}
# Files to highlight as "System Heart"
CORE_CONFIG_FILES = {'quasar.config.js', 'quasar.conf.js', 'package.json', 'src/router/routes.js'}

class QuasarContextExporter:
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.project_name = os.path.basename(root_dir)

    def get_file_content_summary(self, relative_path):
        """Extracts key lines from config files to help AI understand the setup."""
        full_path = os.path.join(self.root_dir, relative_path)
        if not os.path.exists(full_path):
            return "File not found."
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                # Return first 50 lines of config files to show plugins/dependencies
                return "".join(lines[:50]) + "\n... (truncated)"
        except Exception as e:
            return f"Error reading file: {e}"

    def generate_tree(self, path, prefix=""):
        """Generates a clean tree view excluding noise."""
        tree_str = ""
        entries = sorted(os.listdir(path))
        entries = [e for e in entries if e not in IGNORE_DIRS]

        for i, entry in enumerate(entries):
            full_path = os.path.join(path, entry)
            is_last = (i == len(entries) - 1)
            connector = "└── " if is_last else "├── "
            
            tree_str += f"{prefix}{connector}{entry}\n"
            
            if os.path.isdir(full_path):
                extension_prefix = "    " if is_last else "│   "
                tree_str += self.generate_tree(full_path, prefix + extension_prefix)
        return tree_str

    def get_quasar_info(self):
        """Reads package.json to find Quasar version and dependencies."""
        pkg_path = os.path.join(self.root_dir, 'package.json')
        if os.path.exists(pkg_path):
            with open(pkg_path, 'r') as f:
                data = json.load(f)
                deps = data.get('dependencies', {})
                dev_deps = data.get('devDependencies', {})
                return {
                    "framework": "Quasar v2 (Vue 3)" if "quasar" in deps else "Unknown",
                    "state_mgmt": "Pinia" if "pinia" in deps else "Vuex/None",
                    "important_deps": {k: v for k, v in deps.items() if 'quasar' in k or 'axios' in k or 'pinia' in k}
                }
        return {}

    def export(self):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        info = self.get_quasar_info()
        
        output = []
        output.append(f"# AI Context: {self.project_name}")
        output.append(f"**Generated on:** {timestamp}")
        output.append(f"**Tech Stack:** {info.get('framework')} | State: {info.get('state_mgmt')}")
        output.append("\n## 1. Project Structure")
        output.append("```text")
        output.append(self.generate_tree(self.root_dir))
        output.append("```")

        output.append("\n## 2. Core Routing (routes.js)")
        output.append("```javascript")
        output.append(self.get_file_content_summary('src/router/routes.js'))
        output.append("```")

        output.append("\n## 3. Quasar Configuration Snippet")
        output.append("```javascript")
        # Try both naming conventions
        config_file = 'quasar.config.js' if os.path.exists(os.path.join(self.root_dir, 'quasar.config.js')) else 'quasar.conf.js'
        output.append(self.get_file_content_summary(config_file))
        output.append("```")

        # Save to file
        export_name = "AI_SYSTEM_CONTEXT.md"
        with open(export_name, "w", encoding="utf-8") as f:
            f.write("\n".join(output))
        
        print(f"✅ Successfully exported AI context to {export_name}")

if __name__ == "__main__":
    exporter = QuasarContextExporter(os.getcwd())
    exporter.export()