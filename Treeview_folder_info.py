import os
import sys

def get_human_readable_size(size_bytes):
    """Convert a size in bytes to a human-readable string."""
    if size_bytes == 0:
        return "0 Bytes"
    sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(sizes) - 1:
        size_bytes /= 1024
        i += 1
    return f"{size_bytes:.2f} {sizes[i]}"

def get_dir_size(path):
    """Calculates the total size of a directory recursively."""
    total_size = 0
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.exists(fp) and not os.path.islink(fp):
                try:
                    total_size += os.path.getsize(fp)
                except OSError:
                    continue
    return total_size

def count_subdirs(directory):
    return sum(os.path.isdir(os.path.join(directory, entry)) for entry in os.listdir(directory))

def find_target_files(directory, target_files):
    """
    Finds all paths to target files within the directory.
    """
    found_paths = []
    for dirpath, _, filenames in os.walk(directory):
        for filename in filenames:
            if filename in target_files:
                found_paths.append(os.path.join(dirpath, filename))
    return sorted(found_paths)

def generate_focused_tree_from_paths(paths, root_dir, show_sizes=True, file_limit=None):
    """
    Generates a directory tree representation from a list of specific file paths.
    
    :param file_limit: Maximum number of files to display per directory.
    """
    if not paths:
        return ["No specified files were found in the directory."]

    lines = []
    # Get all unique directory paths that contain a target file
    all_dirs = set(os.path.dirname(p) for p in paths)
    
    # Create a single set of all paths to include in the tree
    tree_paths = set(paths)
    for d in all_dirs:
        # Add all parent directories up to the root
        p = d
        while p != root_dir:
            tree_paths.add(p)
            p = os.path.dirname(p)
        tree_paths.add(root_dir)

    tree_paths_sorted = sorted(list(tree_paths))

    # This dictionary will hold the final tree structure
    tree_dict = {}
    for path in tree_paths_sorted:
        rel_path = os.path.relpath(path, root_dir)
        components = rel_path.split(os.sep)
        
        current_level = tree_dict
        for component in components:
            if component not in current_level:
                current_level[component] = {}
            current_level = current_level[component]
            
    def build_tree_lines(current_dict, prefix=""):
        # Sort directories first, then files
        entries = sorted(current_dict.keys(), key=lambda k: (os.path.isfile(os.path.join(root_dir, *prefix.strip().split(os.sep), k)), k))
        
        # Apply file limit for files at this level
        dir_entries = [e for e in entries if os.path.isdir(os.path.join(root_dir, *prefix.strip().split(os.sep), e))]
        file_entries = [e for e in entries if not os.path.isdir(os.path.join(root_dir, *prefix.strip().split(os.sep), e))]
        
        # Apply the file limit here
        limited_file_entries = file_entries
        files_omitted = 0
        if file_limit is not None and file_limit >= 0 and len(file_entries) > file_limit:
            limited_file_entries = file_entries[:file_limit]
            files_omitted = len(file_entries) - file_limit
            
        entries_to_display = dir_entries + limited_file_entries
        
        for i, entry in enumerate(entries_to_display):
            path = os.path.join(root_dir, *prefix.strip().split(os.sep), entry)
            is_dir = os.path.isdir(path)
            is_last = (i == len(entries_to_display) - 1) and (files_omitted == 0) # Adjust is_last logic
            connector = "└── " if is_last else "├── "
            
            size_str = ""
            if show_sizes:
                try:
                    if os.path.exists(path):
                        if is_dir:
                            size = get_dir_size(path)
                            size_str = f" ({get_human_readable_size(size)})"
                        else:
                            size = os.path.getsize(path)
                            size_str = f" ({get_human_readable_size(size)})"
                except OSError as e:
                    size_str = f" (Error getting size: {e})".replace(root_dir, '')

            lines.append(f"{prefix}{connector}{entry}{'/' if is_dir else ''}{size_str}")
            
            if is_dir and current_dict.get(entry):
                new_prefix = prefix + ("    " if is_last else "│   ")
                # When files are omitted, the last connector for the last displayed item (which might be a dir) should use the '│   ' connector
                # We need to look ahead. If files are omitted, the next line is the omitted message, so the current one isn't the true 'last'.
                is_last_for_dir = (i == len(entries_to_display) - 1)
                new_prefix_for_dir = prefix + ("    " if is_last_for_dir and files_omitted == 0 else "│   ")
                
                build_tree_lines(current_dict[entry], new_prefix_for_dir)

        # Add line for omitted files at the end of the directory's content
        if files_omitted > 0:
            connector = "└── " if len(dir_entries + limited_file_entries) == len(entries_to_display) else "├── "
            # If the last item displayed was the last in the limited list, the connector for the 'omitted' message should be the final one.
            omitted_connector = "└── " if len(dir_entries + limited_file_entries) == len(entries_to_display) else "└── " # This logic is simpler for focus mode
            lines.append(f"{prefix}{omitted_connector}... {files_omitted} more file(s) omitted.")

    build_tree_lines(tree_dict)
    return lines


def generate_tree_full(directory, prefix="", depth_limit=None, current_depth=0, show_sizes=True, exclude_script=False, file_limit=None):
    """
    Generates a full directory tree representation (original logic) with file limit.
    
    :param file_limit: Maximum number of files to display per directory.
    """
    entries = sorted(os.listdir(directory))
    output = []
    
    script_name = os.path.basename(__file__)
    if exclude_script:
        entries = [entry for entry in entries if entry != script_name]

    dirs = [entry for entry in entries if os.path.isdir(os.path.join(directory, entry))]
    files = [entry for entry in entries if not os.path.isdir(os.path.join(directory, entry))]

    # Apply file limit here
    files_omitted = 0
    limited_files = files
    if file_limit is not None and file_limit >= 0 and len(files) > file_limit:
        limited_files = files[:file_limit]
        files_omitted = len(files) - file_limit

    entries_ordered = dirs + limited_files

    for index, entry in enumerate(entries_ordered):
        path = os.path.join(directory, entry)
        is_dir = os.path.isdir(path)
        # The 'last' item is the last entry in the combined dirs + limited_files list,
        # AND there are no omitted files to show after it.
        is_last = (index == len(entries_ordered) - 1) and (files_omitted == 0)
        connector = "└── " if is_last else "├── "
        
        size_str = ""
        if show_sizes:
            try:
                if is_dir:
                    if depth_limit is None or current_depth <= depth_limit:
                        size = get_dir_size(path)
                        size_str = f" ({get_human_readable_size(size)})"
                    output.append(f"{prefix}{connector}{entry}/{size_str}")
                    if depth_limit is None or current_depth < depth_limit:
                        # Determine the prefix for the recursive call
                        # If the current item is the last one AND no files are omitted, use spaces.
                        # Otherwise, use the pipe.
                        new_prefix = prefix + ("    " if is_last else "│   ")
                        output.extend(generate_tree_full(path, new_prefix, depth_limit, current_depth + 1, show_sizes, exclude_script, file_limit))
                else:
                    size = os.path.getsize(path)
                    size_str = f" ({get_human_readable_size(size)})"
                    output.append(f"{prefix}{connector}{entry}{size_str}")
            except OSError as e:
                output.append(f"{prefix}{connector}{entry} (Error getting size: {e})")
        else: 
            output.append(f"{prefix}{connector}{entry}{'/' if is_dir else ''}")
            if is_dir and (depth_limit is None or current_depth < depth_limit):
                # Determine the prefix for the recursive call (same logic as above)
                new_prefix = prefix + ("    " if is_last else "│   ")
                output.extend(generate_tree_full(path, new_prefix, depth_limit, current_depth + 1, show_sizes, exclude_script, file_limit))

    # Add line for omitted files after all displayed files
    if files_omitted > 0:
        is_last_omitted_message = True # The omitted message is always the last thing displayed for this directory
        omitted_connector = "└── " if is_last_omitted_message else "├── "
        output.append(f"{prefix}{omitted_connector}... {files_omitted} more file(s) omitted.")

    return output

def main():
    try:
        current_dir = os.getcwd()
        full_root = os.path.abspath(current_dir)
        
        # --- QUICK USE CHECK: Check for 'q' at the first prompt ---
        target_files_input = input("Enter filenames to focus on (comma or space separated, leave blank for all files, or 'q' for quick use): ").strip()
        
        quick_use = target_files_input.lower() == 'q'

        if quick_use:
            print("Quick use selected: Setting defaults.")
            target_files = set()    # Blank for all files
            show_sizes = True        # Y
            exclude_script = True    # Y
            file_limit = None        # No limit
            level = 0                # 0 levels
        else:
            # --- NORMAL INPUT PATH ---
            
            # 1. Process target files
            target_files = set(
                filename.strip().rstrip(',.')
                for separator in [',', ' ', '\n']
                for filename in target_files_input.replace(separator, ',').split(',')
                if filename.strip()
            )

            # 2. Show file sizes prompt
            show_sizes_choice = input("Do you want to show file sizes? (Y/N): ").strip().lower()
            show_sizes = show_sizes_choice == 'y'
            
            # 3. Exclude script prompt
            exclude_script_choice = input("Do you want to exclude the script file from the list? (Y/N): ").strip().lower()
            exclude_script = exclude_script_choice == 'y'
            
            # 4. Max files prompt
            file_limit = None
            while True:
                try:
                    choice = input("Enter max files to display per folder (Press Enter for no limit): ").strip()
                    
                    if choice == "":
                        file_limit = None
                        break
                    
                    if choice.lower() == "^c":
                        raise KeyboardInterrupt
                        
                    limit = int(choice)
                    if limit < 0:
                        print("⚠️ Please enter a non-negative number.")
                        continue
                    
                    # '0' also means no limit, setting it to None
                    file_limit = limit if limit > 0 else None
                    break
                except ValueError:
                    print("⚠️ Please enter a valid number (or just press Enter for no limit).")
            # --- END NORMAL INPUT PATH ---

        root_size_str = ""
        if show_sizes:
            root_size = get_dir_size(current_dir)
            root_size_str = f" ({get_human_readable_size(root_size)})"

        output = [f"{full_root}\\ {root_size_str}"]

        if target_files:
            print("\nGenerating focused tree for specified files...")
            all_relevant_paths = find_target_files(current_dir, target_files)
            if not all_relevant_paths:
                output += ["No specified files were found in the directory."]
            else:
                # Pass the new file_limit
                output += generate_focused_tree_from_paths(all_relevant_paths, current_dir, show_sizes, file_limit)
        else:
            print("\nNo target files specified. Generating full directory tree.")
            subdir_count = count_subdirs(current_dir)
            print(f"How many Child folder to expand? (Detected: {subdir_count} subdirectories)")
            
            # --- LEVEL PROMPT: Only prompt if not in quick use ---
            if not quick_use:
                while True:
                    try:
                        choice = input("Enter number of levels to expand (0 = just root): ")
                        if choice.lower() == "^c":
                            raise KeyboardInterrupt
                        level = int(choice)
                        break
                    except ValueError:
                        print("⚠️ Please enter a valid number.")
            # --- END LEVEL PROMPT ---
            
            # Pass the level variable (either 0 from quick_use or user input)
            output += generate_tree_full(current_dir, depth_limit=level, show_sizes=show_sizes, exclude_script=exclude_script, file_limit=file_limit)
        
        print()
        print("\n".join(output))

        script_filename = os.path.basename(__file__)
        output_filename_base = os.path.splitext(script_filename)[0]
        output_filename = f"{output_filename_base}.txt"

        # --- EXPORT PROMPT MODIFICATION: Enter for Yes ---
        # Changed prompt text to indicate Enter for Yes
        save = input(f"Do you want to export this list to {output_filename}? (Y/N - Press Enter for Yes): ").strip().lower()
        
        # Check for 'y' or an empty string (Enter press)
        if save == 'y' or save == '':
            with open(output_filename, "w", encoding="utf-8") as f:
                f.write("\n".join(output))
            print(f"✅ Saved to '{output_filename}'")
        else:
            print("❌ Not saved.")
        # --- END EXPORT PROMPT MODIFICATION ---

    except KeyboardInterrupt:
        print("\n^C\nTerminate batch job (Y/N)?", end=" ")
        try:
            confirm = input().strip().lower()
            if confirm == 'y':
                print("👋 Job terminated.")
                sys.exit()
            else:
                print("🔁 Resuming...")
                main()
        except KeyboardInterrupt:
            print("\nForce exiting.")
            sys.exit()

if __name__ == "__main__":
    main()