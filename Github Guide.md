Here is the complete, updated Master Git Reference Guide. You can copy and paste this entire block into your documentation.

Master Git Reference Guide

1. The "One-Time" Setup Commands

Use these only when starting a brand new project folder or connecting to a new GitHub repository for the first time.

# git init

The Big Bang. Turns your current folder into a Git repository.

# git remote add origin <url>

The Link. Connects your local folder to a specific repository on the GitHub cloud.

# git branch -M main

The Rename. Sets your primary timeline to "main".

# git push -u origin main

The First Upload. Uploads your code to the cloud for the first time.

2. The Daily Workflow (The Loop)

Use these every time you finish a feature, fix a bug, or get a successful result from the AI.

# git add .

The Stage. Gathers all changed files and prepares them for the snapshot.

# git commit -m "message"

The Snapshot. Permanently saves the current state of your files to your local history.

# git push

The Sync. Uploads your local snapshots to GitHub.

3. Nested Repository Management (The "Deep Clean" Fix)

Use these when you accidentally place a folder that contains its own .git repository inside your main project.

# git rm -r -f --cached "Folder Name"

The Force Unlink. Forces the removal of a nested repository link from your index so Git stops tracking it as a submodule.

find "Folder Name" -name ".git" -type d -exec rm -rf {} +

The "Nuke" Command. Searches deep inside a target folder and deletes every hidden .git tracker found.
Note: This does not delete source code; it only deletes the internal Git tracking history.

.gitignore (File)

The Ignore List. Add the folder name (e.g., Folder Name/) to this file to prevent Git from ever scanning it again.

4. Time Travel & History Management

Use these commands to view past versions of your project or revert to a previous state.

# git log --oneline

The Map. Displays a list of all your previous commits with their unique "Hash" IDs.

# git checkout <hash>

The Peek. Allows you to "travel" to a specific past commit to view your code exactly as it was at that time.
Example: git checkout 122ea84
Note: You are now in "Detached HEAD" mode—you can look at your files, but do not make new commits here.

# git checkout main

The Return. Jumps back to the "present" (the latest state of your project).
Example: git checkout main

# git reset --hard <hash>

The Time Warp. Permanently moves your current project back to a specific commit and deletes all work done after that point.
Example: git reset --hard 74ede1e
Warning: This is destructive. Any work saved after that commit will be deleted forever from your local computer.

5. The "Panic Buttons" (Undo & Fixes)

Use these when things go wrong locally and you want to undo recent unsaved changes.

# git checkout .

The Nuclear Undo. Deletes ALL local changes made since your last commit.

# git status

The Status Report. Tells you which files have been modified and the current state of your repository.

6. The "Overwrite Protocol" (Switching Repos & Hard Resets)

Use these commands if you need to point your folder to a NEW repository or completely overwrite your local files with what is in the Cloud.

# git remote set-url origin <new_url>

The Edit Contact. Updates the link to a new GitHub repository URL.

# git fetch origin

The Download. Downloads the latest history/data from the cloud to your computer without touching your files.

# git reset --hard origin/main

The Clone / Overwrite. Destroys local work and makes your files look EXACTLY like the version on the cloud.

7. The "Force Upload" (Overwriting Cloud with Local)

Use this if you get the error ! [rejected] ... fetch first.

# git push -f origin main

The Force Push. Deletes the cloud history and replaces it with your current local version. Use with caution.

Pro-Tip: The Cursor UI Shortcut

# git add . = Clicking the + (Plus) icon in the Source Control sidebar.

# git commit = Typing a message in the box and clicking Commit.

# git push = Clicking the blue Sync Changes button.

# git checkout . = Clicking the Curved Arrow (Discard Changes) icon on the file list.

8. Worktree Management (Multiple Workspaces)

Use these commands when working with AI assistants or when you need multiple isolated workspaces for the same project.

# git worktree list

The Inventory. Shows all active worktrees, their paths, and which branches they're using.
Example output: Shows your main folder plus any AI-created worktree folders.

# git worktree add <path> <branch>

The Clone Door. Creates a new worktree folder for working on a different branch simultaneously.
Example: git worktree add ../feature-branch feature-branch
Note: This creates a physical folder where you can work on a separate branch without switching.

# git worktree remove <path>

The Clean Sweep. Safely removes a worktree folder and updates Git's records automatically.
Example: git worktree remove C:/Users/Unstats/.windsurf/worktrees/hodl-vault-app/hodl-vault-app-cdabccf7
Note: Use the exact path from 'git worktree list' output.

# git worktree prune

The Garbage Collector. Cleans up references to worktrees that were deleted manually.
Use this when: You deleted worktree folders using File Explorer instead of 'git worktree remove'.

# git branch -D <branch-name>

The Branch Delete. Removes a branch permanently from your local repository.
Example: git branch -D cascade/experimental-feature
Warning: Cannot delete a branch that's still being used by an active worktree.

9. Worktree & Branch Creation (The Complete Setup)

Use these procedures to create organized worktrees and branches for simultaneous feature development.

# git checkout -b <branch-name>

The Timeline. Creates a new branch timeline from your current location.
Example: git checkout -b feature-authentication
Note: This creates a branch pointer, not a worktree folder.

# git branch <branch-name>

The Bookmark. Creates a branch without switching to it.
Example: git branch feature-payment
Use when: You want to create the branch first, then create a worktree for it.

# git worktree add <path> <branch>

The Parallel Universe. Creates a physical worktree folder linked to a specific branch.
Example: git worktree add ../feature-auth feature-auth
Note: Each worktree folder can only check out one branch at a time.

# git worktree add <path> <branch> -b <new-branch>

The Combo Move. Creates both a new branch AND a new worktree simultaneously.
Example: git worktree add ../feature-dashboard -b feature-dashboard
Use when: You want to create a brand new feature with its own workspace.

10. Worktree Organization Strategies

Use these patterns to organize your development workflow.

Strategy A: Multiple Worktrees for Multiple Features (Recommended for Complex Projects)

1. Create branches for all features first:
   git checkout -b feature-auth
   git checkout -b feature-payment
   git checkout -b feature-dashboard

2. Create worktrees for each feature:
   git worktree add ../auth-workspace feature-auth
   git worktree add ../payment-workspace feature-payment
   git worktree add ../dashboard-workspace feature-dashboard

3. Work in isolated environments:
   cd ../auth-workspace (work on authentication only)
   cd ../payment-workspace (work on payment system only)
   cd ../dashboard-workspace (work on dashboard only)

Strategy B: Single Worktree with Sequential Branching (Simple Projects)

1. Stay in main folder and create branches as needed:
   git checkout -b feature-auth
   git add . && git commit -m "Start authentication feature"
2. Switch branches when starting new features:
   git checkout feature-payment
   git add . && git commit -m "Start payment feature"

3. Use stash to save incomplete work:
   git stash push -m "auth work in progress"
   git checkout feature-payment

Strategy C: Worktree Per Epic (Large Projects)

1. Group related features into epics:
   git checkout -b epic-user-management
   git checkout -b epic-payment-system

2. Create worktrees for each epic:
   git worktree add ../user-management epic-user-management
   git worktree add ../payment-system epic-payment-system

3. Create feature branches inside epic worktrees:
   cd ../user-management
   git checkout -b feature-login
   git checkout -b feature-profile

4. Worktree Maintenance & Cleanup

Use these commands to keep your worktrees organized and clean.

# git worktree list

The Census. Shows all active worktrees and their current branches.
Use this first to see what needs cleanup.

# git worktree remove --force <path>

The Forced Eviction. Removes a worktree even if it has uncommitted changes.
Example: git worktree remove --force ../old-feature
Warning: This will delete all uncommitted changes in that worktree.

# git branch -D <branch-name>

The Memory Wipe. Deletes a branch permanently.
Example: git branch -D cascade/experimental-feature
Note: Only delete branches after removing their worktrees first.

# git worktree prune

The Housekeeping. Removes stale worktree references.
Use when: You deleted worktree folders manually and need to clean up Git's records.

Complete Cleanup Workflow:

1. Survey your worktrees:
   git worktree list

2. Remove unwanted worktrees:
   git worktree remove ../feature-auth
   git worktree remove ../feature-payment

3. Delete associated branches:
   git branch -D feature-auth
   git branch -D feature-payment

4. Clean up Git's memory:
   git worktree prune

Important Rules:

- Always remove worktrees BEFORE deleting their branches
- Each worktree folder = one branch at a time
- Branch creation is identical in all worktrees
- Multiple worktrees = simultaneous development
- Single worktree = sequential development

12. Repository Setup Strategies (The Smart Start)

Use these patterns to avoid Git setup conflicts and ensure smooth repository initialization.

# git clone <url>

The Clean Start. Downloads an existing repository with proper history connection.
Example: git clone https://github.com/username/repo-name.git
Use when: Starting with existing GitHub repository (RECOMMENDED).

# git init

The Fresh Start. Creates a new local repository from scratch.
Example: git init
Use when: Starting completely new project that doesn't exist anywhere yet.

# git remote add origin <url>

The Link. Connects your local repository to a GitHub repository.
Example: git remote add origin https://github.com/username/repo-name.git
Use when: Connecting existing local project to empty GitHub repository.

# git remote remove origin

The Divorce. Disconnects your local repository from current GitHub repository.
Example: git remote remove origin
Use when: Moving your project to a different GitHub repository.

# git push -u origin main --allow-unrelated-histories

The Bridge. Forces connection between two separate Git histories.
Example: git push -u origin main --allow-unrelated-histories
Use when: You have local project and GitHub repo with different starting points.

Repository Setup Workflows:

Workflow A: GitHub First (Best for New Projects)

1. Create empty repository on GitHub website
2. Clone repository locally:
   git clone https://github.com/username/repo-name.git
3. Start working normally:
   git add . && git commit -m "Start project" && git push

Workflow B: Local First (When You Have Existing Code)

1. Work on project locally until ready
2. Create empty repository on GitHub
3. Connect and force initial push:
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main --allow-unrelated-histories

Workflow C: Repository Migration (Moving Between Repositories)

1. Remove old remote connection:
   git remote remove origin
2. Add new remote connection:
   git remote add origin https://github.com/username/new-repo-name.git
3. Push to new location:
   git push -u origin main

Setup Troubleshooting:

Error: "no upstream branch"
Fix: git push -u origin main

Error: "fetch first"
Fix: git pull origin main

Error: "unrelated histories"
Fix: git pull origin main --allow-unrelated-histories

Key Principles:

- Clone first when possible (avoids history conflicts)
- Local first when you have existing code to upload
- Always use --allow-unrelated-histories for first-time connections
- Remote changes require git pull before git push
