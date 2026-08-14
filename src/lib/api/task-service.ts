import { apiClient } from "@/lib/api/client";
import { selectShop } from "@/lib/api/multi-shop-service";
import { parseTaskResponse, type TaskResponse } from "@/types/task";

/**
 * Ported from TaskService (task_service.dart). status codes:
 * 0=new/waiting, 1=passed, 2=cancelled, 3=notRecorded, 4=waitingVerify,
 * 5=(unused), 6=notRequiredApproval — matches KpiCombinedBloc's usage.
 */
export async function fetchTasks(params: {
  limit?: number;
  status?: number[];
  page?: number;
  skipShopSelection?: boolean;
}): Promise<TaskResponse> {
  const { limit = 10, status = [0, 1, 2, 3, 4, 5, 6], page = 1, skipShopSelection = false } = params;

  if (!skipShopSelection) {
    await selectShop();
  }

  const { data } = await apiClient.get("/task", {
    params: { limit, status: status.join(","), page, sort: "ownerat:-1" },
  });
  return parseTaskResponse(data);
}

/** Ported from TaskService.fetchTasksForShop — selects the shop first, then fetches with skipShopSelection. */
export async function fetchTasksForShop(params: {
  shopId: string;
  limit?: number;
  status?: number[];
  page?: number;
}): Promise<TaskResponse> {
  const { shopId, limit = 10, status = [0, 1, 2, 3, 4, 5, 6], page = 1 } = params;

  const ok = await selectShop(shopId);
  if (!ok) throw new Error("ไม่สามารถเลือกร้านได้");

  return fetchTasks({ limit, status, page, skipShopSelection: true });
}
