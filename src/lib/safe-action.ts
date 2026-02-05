export type ActionState<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function safeAction<T>(
  actionName: string,
  fn: () => Promise<T>
): Promise<ActionState<T>> {
  try {
    console.log(`[Action:Start] ${actionName}`);
    const data = await fn();
    console.log(`[Action:Success] ${actionName}`);
    return { success: true, data };
  } catch (e: any) {
    console.error(`[Action:Error] ${actionName}:`, e);
    return { success: false, error: e.message || 'Unknown server error' };
  }
}
