import { selectReminders, tomorrow } from "../../../worker-lib/reminders";

const baseTask = {
  id: "t1",
  title: "Call client",
  due_at: null as string | null,
  notified_at: null as string | null,
  done_at: null as string | null,
};

const baseMilestone = {
  id: "m1",
  deal_id: "d1",
  title: "Home inspection",
  date: null as string | null,
  status: "upcoming",
  reminded_day_before: null as string | null,
  reminded_day_of: null as string | null,
};

describe("tomorrow", () => {
  test("adds one day, UTC-safe", () => {
    expect(tomorrow("2026-07-18")).toBe("2026-07-19");
  });

  test("rolls over month/year boundaries", () => {
    expect(tomorrow("2026-01-31")).toBe("2026-02-01");
    expect(tomorrow("2025-12-31")).toBe("2026-01-01");
  });
});

describe("selectReminders — tasks", () => {
  test("timed task not yet due is held", () => {
    const now = { date: "2026-07-18", hhmm: "09:00", hour: 9 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18T14:30" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual([]);
  });

  test("timed task due fires", () => {
    const now = { date: "2026-07-18", hhmm: "14:30", hour: 14 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18T14:30" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual(["t1"]);
  });

  test("timed task past due fires", () => {
    const now = { date: "2026-07-18", hhmm: "15:00", hour: 15 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18T14:30" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual(["t1"]);
  });

  test("date-only task before 8am is held", () => {
    const now = { date: "2026-07-18", hhmm: "07:59", hour: 7 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual([]);
  });

  test("date-only task after 8am fires", () => {
    const now = { date: "2026-07-18", hhmm: "08:00", hour: 8 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual(["t1"]);
  });

  test("already-notified task is skipped", () => {
    const now = { date: "2026-07-18", hhmm: "14:30", hour: 14 };
    const tasks = [{ ...baseTask, due_at: "2026-07-18T14:30", notified_at: "2026-07-18T14:30:00.000Z" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual([]);
  });

  test("done task is skipped even if overdue", () => {
    const now = { date: "2026-07-18", hhmm: "14:30", hour: 14 };
    const tasks = [{ ...baseTask, due_at: "2026-07-10T14:30", done_at: "2026-07-11T00:00:00.000Z" }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual([]);
  });

  test("task with no due_at never fires", () => {
    const now = { date: "2026-07-18", hhmm: "14:30", hour: 14 };
    const tasks = [{ ...baseTask, due_at: null }];
    expect(selectReminders(now, tasks, []).dueTaskIds).toEqual([]);
  });
});

describe("selectReminders — milestones", () => {
  test("day-before fires at/after 9am when date is tomorrow", () => {
    const now = { date: "2026-07-18", hhmm: "09:00", hour: 9 };
    const milestones = [{ ...baseMilestone, date: "2026-07-19" }];
    const r = selectReminders(now, [], milestones);
    expect(r.dayBefore).toEqual(["m1"]);
    expect(r.dayOf).toEqual([]);
  });

  test("day-before held before 9am", () => {
    const now = { date: "2026-07-18", hhmm: "08:59", hour: 8 };
    const milestones = [{ ...baseMilestone, date: "2026-07-19" }];
    expect(selectReminders(now, [], milestones).dayBefore).toEqual([]);
  });

  test("day-before already reminded does not fire again", () => {
    const now = { date: "2026-07-18", hhmm: "09:00", hour: 9 };
    const milestones = [{ ...baseMilestone, date: "2026-07-19", reminded_day_before: "2026-07-18T09:00:00.000Z" }];
    expect(selectReminders(now, [], milestones).dayBefore).toEqual([]);
  });

  test("day-of fires at/after 8am when date is today", () => {
    const now = { date: "2026-07-18", hhmm: "08:00", hour: 8 };
    const milestones = [{ ...baseMilestone, date: "2026-07-18" }];
    const r = selectReminders(now, [], milestones);
    expect(r.dayOf).toEqual(["m1"]);
    expect(r.dayBefore).toEqual([]);
  });

  test("day-of held before 8am", () => {
    const now = { date: "2026-07-18", hhmm: "07:59", hour: 7 };
    const milestones = [{ ...baseMilestone, date: "2026-07-18" }];
    expect(selectReminders(now, [], milestones).dayOf).toEqual([]);
  });

  test("day-of already reminded does not fire again", () => {
    const now = { date: "2026-07-18", hhmm: "08:00", hour: 8 };
    const milestones = [{ ...baseMilestone, date: "2026-07-18", reminded_day_of: "2026-07-18T08:00:00.000Z" }];
    expect(selectReminders(now, [], milestones).dayOf).toEqual([]);
  });

  test("done milestone never fires", () => {
    const now = { date: "2026-07-18", hhmm: "09:00", hour: 9 };
    const milestones = [{ ...baseMilestone, date: "2026-07-19", status: "done" }];
    expect(selectReminders(now, [], milestones).dayBefore).toEqual([]);
  });

  test("skipped milestone never fires", () => {
    const now = { date: "2026-07-18", hhmm: "08:00", hour: 8 };
    const milestones = [{ ...baseMilestone, date: "2026-07-18", status: "skipped" }];
    expect(selectReminders(now, [], milestones).dayOf).toEqual([]);
  });

  test("milestone with no date never fires", () => {
    const now = { date: "2026-07-18", hhmm: "09:00", hour: 9 };
    const milestones = [{ ...baseMilestone, date: null }];
    const r = selectReminders(now, [], milestones);
    expect(r.dayBefore).toEqual([]);
    expect(r.dayOf).toEqual([]);
  });
});
