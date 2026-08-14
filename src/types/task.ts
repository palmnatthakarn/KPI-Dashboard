/** Ported 1:1 from lib/models/task.dart. */
export interface DocumentStatusCount {
  status: number;
  total: number;
}

export interface TaskChild {
  guidfixed: string;
  code: string;
  name: string;
  status: number;
}

/**
 * status codes: 0=uploaded(new/waiting), 1=passed, 2=cancelled, 3=notRecorded,
 * 4=waitingVerify(as full-status)/completed depending on context, 6=notRequiredApproval.
 * (See KpiCombinedBloc's per-task derivation for the exact status→column mapping.)
 */
export interface TaskItem {
  guidfixed: string;
  code: string;
  name: string;
  module: string;
  status: number;
  parentGuidfixed: string;
  path: string;
  isFavorit: boolean;
  tags?: string[];
  description: string;
  totalDocument: number;
  totalDocumentStatus: DocumentStatusCount[];
  ownerAt: Date;
  ownerBy: string;
  billCount: number;
  referenceCount: number;
  referenceBalance: number;
  rejectFromTaskGuid: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  taskChild?: TaskChild;
}

export interface TaskPagination {
  total: number;
  page: number;
  perPage: number;
  prev: number;
  next: number;
  totalPage: number;
}

export interface TaskResponse {
  success: boolean;
  tasks: TaskItem[];
  pagination?: TaskPagination;
}

/** task.getStatusCount(statusCode) — first matching status bucket's total, else 0. */
export function getStatusCount(task: TaskItem, statusCode: number): number {
  const found = task.totalDocumentStatus.find((s) => s.status === statusCode);
  return found ? found.total : 0;
}

export function taskCancelledCount(task: TaskItem): number {
  return getStatusCount(task, 2);
}

export function taskNotRequiredApprovalCount(task: TaskItem): number {
  return getStatusCount(task, 6);
}

export function parseTaskItem(json: any): TaskItem {
  const statusList: DocumentStatusCount[] = Array.isArray(json?.totaldocumentstatus)
    ? json.totaldocumentstatus.map((e: { status?: number; total?: number }) => ({
        status: e?.status ?? 0,
        total: e?.total ?? 0,
      }))
    : [];

  let child: TaskChild | undefined;
  const rawChild = json?.taskchild;
  if (rawChild?.guidfixed != null && String(rawChild.guidfixed).length > 0) {
    child = {
      guidfixed: String(rawChild.guidfixed ?? ""),
      code: String(rawChild.code ?? ""),
      name: String(rawChild.name ?? ""),
      status: rawChild.status ?? 0,
    };
  }

  let ownerAt = new Date();
  if (json?.ownerat) {
    const d = new Date(json.ownerat);
    if (!isNaN(d.getTime())) ownerAt = d;
  }

  let rejectedAt: Date | undefined;
  if (json?.rejectedat && json.rejectedat !== "0001-01-01T00:00:00Z") {
    const d = new Date(json.rejectedat);
    if (!isNaN(d.getTime())) rejectedAt = d;
  }

  return {
    guidfixed: String(json?.guidfixed ?? ""),
    code: String(json?.code ?? ""),
    name: String(json?.name ?? ""),
    module: String(json?.module ?? ""),
    status: json?.status ?? 0,
    parentGuidfixed: String(json?.parentguidfixed ?? ""),
    path: String(json?.path ?? ""),
    isFavorit: json?.isfavorit === true,
    tags: Array.isArray(json?.tags) ? json.tags.map(String) : undefined,
    description: String(json?.description ?? ""),
    totalDocument: json?.totaldocument ?? 0,
    totalDocumentStatus: statusList,
    ownerAt,
    ownerBy: String(json?.ownerby ?? ""),
    billCount: json?.billcount ?? 0,
    referenceCount: json?.referencecount ?? 0,
    referenceBalance: json?.referencebalance ?? 0,
    rejectFromTaskGuid: String(json?.rejectfromtaskguid ?? ""),
    rejectedAt,
    rejectedBy: json?.rejectedby != null ? String(json.rejectedby) : undefined,
    taskChild: child,
  };
}

export function parseTaskResponse(json: any): TaskResponse {
  const tasks: TaskItem[] = Array.isArray(json?.data) ? json.data.map(parseTaskItem) : [];
  let pagination: TaskPagination | undefined;
  if (json?.pagination) {
    const p = json.pagination;
    pagination = {
      total: p?.total ?? 0,
      page: p?.page ?? 1,
      perPage: p?.perPage ?? 20,
      prev: p?.prev ?? 0,
      next: p?.next ?? 0,
      totalPage: p?.totalPage ?? 1,
    };
  }
  return { success: json?.success === true, tasks, pagination };
}
