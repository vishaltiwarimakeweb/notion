import { z } from "zod";
import { tool, type ToolSet } from "ai";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getAccessibleWorkspaceIds } from "@/lib/workspaces";
import { cascadeSoftDelete } from "@/lib/pages";
import { escapeRegExp } from "@/lib/search";
import { Workspace } from "@/models/Workspace";
import { Page } from "@/models/Page";
import { Content } from "@/models/Content";
import type { SessionPayload } from "@/lib/session";

const RESULT_LIMIT = 20;
const MIN_TITLE_LENGTH = 3;

type WorkspaceResolution =
  | { error: string }
  | { workspace: InstanceType<typeof Workspace> };
type PageResolution = { error: string } | { page: InstanceType<typeof Page> };

function accessibleWorkspaceFilter(
  session: SessionPayload,
  workspaceIds: mongoose.Types.ObjectId[] | null
) {
  return workspaceIds === null
    ? { organizationId: session.organizationId, isDeleted: false }
    : { _id: { $in: workspaceIds }, isDeleted: false };
}

async function resolveWorkspaceByTitle(
  session: SessionPayload,
  title: string
): Promise<WorkspaceResolution> {
  await connectToDatabase();
  const workspaceIds = await getAccessibleWorkspaceIds(session);
  const filter = {
    ...accessibleWorkspaceFilter(session, workspaceIds),
    title: new RegExp(`^${escapeRegExp(title.trim())}$`, "i"),
  };

  const matches = await Workspace.find(filter);
  if (matches.length === 0) {
    return { error: `No workspace found named "${title}".` };
  }
  if (matches.length > 1) {
    return { error: `Multiple workspaces are named "${title}" — this shouldn't normally happen.` };
  }
  return { workspace: matches[0] };
}

async function resolvePageByTitle(
  session: SessionPayload,
  title: string,
  workspaceTitle?: string
): Promise<PageResolution> {
  await connectToDatabase();

  let pageFilter: Record<string, unknown>;
  if (workspaceTitle) {
    const resolved = await resolveWorkspaceByTitle(session, workspaceTitle);
    if ("error" in resolved) return resolved;
    pageFilter = { workspaceId: resolved.workspace._id, isDeleted: false };
  } else {
    const workspaceIds = await getAccessibleWorkspaceIds(session);
    pageFilter =
      workspaceIds === null
        ? { organizationId: session.organizationId, isDeleted: false }
        : { workspaceId: { $in: workspaceIds }, isDeleted: false };
  }

  const matches = await Page.find({
    ...pageFilter,
    title: new RegExp(`^${escapeRegExp(title.trim())}$`, "i"),
  });

  if (matches.length === 0) {
    return { error: `No page found named "${title}".` } as const;
  }
  if (matches.length > 1) {
    const workspaces = await Workspace.find({ _id: { $in: matches.map((p) => p.workspaceId) } });
    const workspaceTitleById = new Map(workspaces.map((w) => [w._id.toString(), w.title]));
    const options = matches
      .map((p) => `"${p.title}" in workspace "${workspaceTitleById.get(p.workspaceId.toString())}"`)
      .join(", ");
    return {
      error: `Multiple pages are named "${title}": ${options}. Specify which workspace.`,
    } as const;
  }
  return { page: matches[0] } as const;
}

export function createAssistantTools(session: SessionPayload): ToolSet {
  return {
    searchPages: tool({
      description: "Search for pages by title (case-insensitive, partial match).",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        await connectToDatabase();
        const workspaceIds = await getAccessibleWorkspaceIds(session);
        const pageFilter =
          workspaceIds === null
            ? { organizationId: session.organizationId, isDeleted: false }
            : { workspaceId: { $in: workspaceIds }, isDeleted: false };

        const pages = await Page.find({
          ...pageFilter,
          title: new RegExp(escapeRegExp(query), "i"),
        }).limit(RESULT_LIMIT);
        const workspaces = await Workspace.find({ _id: { $in: pages.map((p) => p.workspaceId) } });
        const workspaceTitleById = new Map(workspaces.map((w) => [w._id.toString(), w.title]));

        return {
          results: pages.map((p) => ({
            title: p.title,
            workspaceTitle: workspaceTitleById.get(p.workspaceId.toString()) ?? "unknown",
          })),
        };
      },
    }),

    searchWorkspaces: tool({
      description: "Search for workspaces by title (case-insensitive, partial match).",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        await connectToDatabase();
        const workspaceIds = await getAccessibleWorkspaceIds(session);
        const workspaces = await Workspace.find({
          ...accessibleWorkspaceFilter(session, workspaceIds),
          title: new RegExp(escapeRegExp(query), "i"),
        }).limit(RESULT_LIMIT);

        return { results: workspaces.map((w) => ({ title: w.title })) };
      },
    }),

    findAllPages: tool({
      description:
        "List all top-level pages (not nested pages) the user has access to, with the workspace each belongs to.",
      inputSchema: z.object({}),
      execute: async () => {
        await connectToDatabase();
        const workspaceIds = await getAccessibleWorkspaceIds(session);
        const pageFilter =
          workspaceIds === null
            ? { organizationId: session.organizationId, isDeleted: false, parentPageId: null }
            : { workspaceId: { $in: workspaceIds }, isDeleted: false, parentPageId: null };

        const pages = await Page.find(pageFilter).limit(RESULT_LIMIT);
        const workspaces = await Workspace.find({ _id: { $in: pages.map((p) => p.workspaceId) } });
        const workspaceTitleById = new Map(workspaces.map((w) => [w._id.toString(), w.title]));

        return {
          results: pages.map((p) => ({
            title: p.title,
            workspaceTitle: workspaceTitleById.get(p.workspaceId.toString()) ?? "unknown",
          })),
        };
      },
    }),

    deletePage: tool({
      description: "Move a page to trash by its title (and optionally its workspace, if ambiguous).",
      inputSchema: z.object({
        title: z.string(),
        workspaceTitle: z.string().optional(),
      }),
      execute: async ({ title, workspaceTitle }) => {
        const resolved = await resolvePageByTitle(session, title, workspaceTitle);
        if ("error" in resolved) return resolved;

        await cascadeSoftDelete(resolved.page._id);
        return { message: `Moved "${resolved.page.title}" to trash.` };
      },
    }),

    editPage: tool({
      description: "Rename a page's title.",
      inputSchema: z.object({
        title: z.string(),
        newTitle: z.string(),
        workspaceTitle: z.string().optional(),
      }),
      execute: async ({ title, newTitle, workspaceTitle }) => {
        if (newTitle.trim().length < MIN_TITLE_LENGTH) {
          return { error: `Page title must be at least ${MIN_TITLE_LENGTH} characters.` };
        }
        const resolved = await resolvePageByTitle(session, title, workspaceTitle);
        if ("error" in resolved) return resolved;

        resolved.page.title = newTitle.trim();
        await resolved.page.save();
        return { message: `Renamed "${title}" to "${newTitle.trim()}".` };
      },
    }),

    createPage: tool({
      description: "Create a new top-level page in a workspace.",
      inputSchema: z.object({
        title: z.string(),
        workspaceTitle: z.string(),
      }),
      execute: async ({ title, workspaceTitle }) => {
        if (title.trim().length < MIN_TITLE_LENGTH) {
          return { error: `Page title must be at least ${MIN_TITLE_LENGTH} characters.` };
        }
        const resolved = await resolveWorkspaceByTitle(session, workspaceTitle);
        if ("error" in resolved) return resolved;

        const page = await Page.create({
          organizationId: resolved.workspace.organizationId,
          workspaceId: resolved.workspace._id,
          parentPageId: null,
          title: title.trim(),
          createdBy: session.userId,
          createdByType: session.userType,
        });
        await Content.create({ pageId: page._id, blocks: [] });

        return { message: `Created "${page.title}" in "${resolved.workspace.title}".` };
      },
    }),

    createNestedPage: tool({
      description: "Create a new page nested inside an existing parent page, by the parent page's title.",
      inputSchema: z.object({
        title: z.string(),
        parentPageTitle: z.string(),
        workspaceTitle: z.string().optional(),
      }),
      execute: async ({ title, parentPageTitle, workspaceTitle }) => {
        if (title.trim().length < MIN_TITLE_LENGTH) {
          return { error: `Page title must be at least ${MIN_TITLE_LENGTH} characters.` };
        }
        const resolved = await resolvePageByTitle(session, parentPageTitle, workspaceTitle);
        if ("error" in resolved) return resolved;

        const page = await Page.create({
          organizationId: resolved.page.organizationId,
          workspaceId: resolved.page.workspaceId,
          parentPageId: resolved.page._id,
          title: title.trim(),
          createdBy: session.userId,
          createdByType: session.userType,
        });
        await Content.create({ pageId: page._id, blocks: [] });

        return { message: `Created "${page.title}" nested inside "${resolved.page.title}".` };
      },
    }),
  };
}
