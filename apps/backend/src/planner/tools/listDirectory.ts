import fs from 'fs';
import path from 'path';

interface ListType {
    name: string;
    type: "directory" | "file"
}

interface ListDirectoryResponse {
    success: boolean;
    list?: ListType[];
    error?: string;
}

export const listDirectory = (
    repoRoot: string, 
    relativePath: string): ListDirectoryResponse => {
        try {
            // validate inputs 
            if(!repoRoot || !relativePath) {
                throw new Error("Repo root or relativePath not available");
            }

            const fullPath = path.resolve(repoRoot, relativePath);

            console.log("Listing Directory for path: ", fullPath);

            if(!fullPath.startsWith(repoRoot)){
                throw new Error("Invalid path: outside repo");
            }

            if(!fs.existsSync(fullPath)){
                throw new Error(`Path does not exist: ${relativePath}`);
            }

            const stats = fs.statSync(fullPath);
            if(!stats.isDirectory()) {
                throw new Error(`Not a directory: ${relativePath}`);
            }

            const entries = fs.readdirSync(fullPath, {withFileTypes: true});

            const list: ListType[] = [];
            entries.map(entry => (list.push({
                name: entry.name,
                type: entry.isDirectory() ? "directory" : "file"
            })))

            return {
                success: true,
                list: list
            }
        } catch(err){
            const errorMessage = err instanceof Error ? err.message : String(err);

            console.log("Could not list directory...");

            return {
                success: false,
                error: errorMessage
            }
        }
}