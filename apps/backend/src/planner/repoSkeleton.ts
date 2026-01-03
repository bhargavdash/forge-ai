import fs from 'fs'
import path from 'path'
import { IGNORED_DIRS } from '../services/workspace/repoIndexer';

const KEY_FILES = new Set([
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "requirements.txt",
    "pyproject.toml",
    "Dockerfile",
    "docker-compose.yml",
    "README.md"
])

interface repoSkeletonResponse {
    success: boolean;
    topLevelDirs?: string[];
    keyFiles?: string[];
    ignored?: string[];
    error?: string;
}

export const buildRepoSkeleton = (repoPath: string): repoSkeletonResponse => {
    try {
        // validate input 
        if(!repoPath || typeof repoPath !== "string"){
            throw new Error("Invalid repo path..");
        }
        console.log("[REPO SKELETON]: Received path: ", repoPath);
        const entries = fs.readdirSync(repoPath, {withFileTypes: true});

        const topLevelDirs: string[] = [];
        const keyFiles: string[] = [];

        for(const entry of entries) {
            if(entry.isDirectory()) {
                if(!IGNORED_DIRS.has(entry.name)) {
                    topLevelDirs.push(`${entry.name}/`);
                }
            } else if(KEY_FILES.has(entry.name)){
                keyFiles.push(entry.name);
            }

        }

        return {
            success: true,
            topLevelDirs,
            keyFiles,
            ignored: Array.from(IGNORED_DIRS)
        }
    } catch (err){
        const errorMessage = err instanceof Error ? err.message : String(err);

        console.log("Failed to create repo skeleton..");

        return {
            success: false,
            error: errorMessage
        }
    }
}