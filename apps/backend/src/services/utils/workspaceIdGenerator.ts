import crypto from 'crypto'

export const generateWorkspaceId = (taskId: string) => {
    return "t_" + crypto
        .createHash("sha1")
        .update(taskId)
        .digest("hex")
        .slice(0,8)
}