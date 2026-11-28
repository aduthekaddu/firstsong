const draftPrefix = "firstsong:v1:draft:";
const writingIdPattern = /^[a-f0-9]{32}$/;
export const writingTake = { id: "recording", label: "Demo take", maxSeconds: 360, trim: true };

export function validWritingId(id: string): boolean {
  return writingIdPattern.test(id);
}

export function writingFieldKey(id: string, field: string) {
  return `${draftPrefix}${id}:field:${field}`;
}

export function writingTakeId(id: string) {
  return `draft:${id}:${writingTake.id}`;
}

function writingMarker(id: string) {
  return `${draftPrefix}${id}:created`;
}

export function findWritingProject(id: string) {
  if (!validWritingId(id)) return null;
  const marker = localStorage.getItem(writingMarker(id));
  if (marker === null) return null;
  const createdAt = Number(marker);
  return Number.isSafeInteger(createdAt) && createdAt > 0 && createdAt <= 8.64e15 ? createdAt : null;
}

export function createWritingProject() {
  const bytes = new Uint8Array(16);
  let id: string;
  do {
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } while (localStorage.getItem(writingMarker(id)) !== null);
  localStorage.setItem(writingMarker(id), String(Date.now()));
  return id;
}

export function listWritingProjects() {
  const projects: { id: string; title: string; createdAt: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(draftPrefix) || !key.endsWith(":created")) continue;
    const id = key.slice(draftPrefix.length, -":created".length);
    const createdAt = findWritingProject(id);
    if (createdAt === null) continue;
    const title = localStorage.getItem(writingFieldKey(id, "title"))?.trim().slice(0, 100) || "";
    projects.push({ id, title, createdAt });
  }
  return projects.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

export function writingProjectHref(id: string) {
  return `/songbook/write/?song=${id}`;
}
