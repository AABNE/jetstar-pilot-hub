import { Router, type IRouter } from "express";
import { db, timetableTable, flightsTable, usersTable, eq, and } from "@workspace/db";

import {
  AddToTimetableBody,
  StartFlightParams,
  StartFlightResponse,
  FinishFlightParams,
  FinishFlightResponse,
  GetTimetableResponse,
  RemoveFromTimetableParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getTimetableWithFlights(userId: number) {
  const entries = await db
    .select()
    .from(timetableTable)
    .where(eq(timetableTable.userId, userId))
    .orderBy(timetableTable.createdAt);

  const result = [];
  for (const entry of entries) {
    const [flight] = await db
      .select()
      .from(flightsTable)
      .where(eq(flightsTable.id, entry.flightId));

    if (flight) {
      result.push({
        id: entry.id,
        userId: entry.userId,
        flightId: entry.flightId,
        status: entry.status,
        startedAt: entry.startedAt ? entry.startedAt.toISOString() : null,
        finishedAt: entry.finishedAt ? entry.finishedAt.toISOString() : null,
        flightDurationSeconds: entry.flightDurationSeconds,
        flight: {
          id: flight.id,
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          arrival: flight.arrival,
          aircraft: flight.aircraft,
          departureTime: flight.departureTime,
          flightDate: flight.flightDate,
          durationMinutes: flight.durationMinutes,
        },
      });
    }
  }
  return result;
}

router.get("/timetable", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const entries = await getTimetableWithFlights(req.session.userId);
  res.json(GetTimetableResponse.parse(entries));
});

router.post("/timetable", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = AddToTimetableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { flightId } = parsed.data;

  // Check flight exists
  const [flight] = await db
    .select()
    .from(flightsTable)
    .where(eq(flightsTable.id, flightId));

  if (!flight) {
    res.status(400).json({ error: "Flight not found" });
    return;
  }

  // Check not already in timetable (non-completed)
  const existing = await db
    .select()
    .from(timetableTable)
    .where(
      and(
        eq(timetableTable.userId, req.session.userId),
        eq(timetableTable.flightId, flightId),
      ),
    );

  const nonCompleted = existing.filter((e) => e.status !== "completed");
  if (nonCompleted.length > 0) {
    res.status(409).json({ error: "Flight already in your timetable" });
    return;
  }

  const [entry] = await db
    .insert(timetableTable)
    .values({
      userId: req.session.userId,
      flightId,
      status: "pending",
    })
    .returning();

  const entries = await getTimetableWithFlights(req.session.userId);
  const created = entries.find((e) => e.id === entry.id);

  res.status(201).json(created);
});

router.post("/timetable/:id/start", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = StartFlightParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(timetableTable)
    .where(
      and(
        eq(timetableTable.id, params.data.id),
        eq(timetableTable.userId, req.session.userId),
      ),
    );

  if (!entry) {
    res.status(404).json({ error: "Timetable entry not found" });
    return;
  }

  const [updated] = await db
    .update(timetableTable)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(timetableTable.id, entry.id))
    .returning();

  const entries = await getTimetableWithFlights(req.session.userId);
  const result = entries.find((e) => e.id === updated.id);

  res.json(StartFlightResponse.parse(result));
});

router.post("/timetable/:id/finish", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = FinishFlightParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(timetableTable)
    .where(
      and(
        eq(timetableTable.id, params.data.id),
        eq(timetableTable.userId, req.session.userId),
      ),
    );

  if (!entry) {
    res.status(404).json({ error: "Timetable entry not found" });
    return;
  }

  const finishedAt = new Date();
  const startedAt = entry.startedAt ?? finishedAt;
  const durationSeconds = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);

  const [updated] = await db
    .update(timetableTable)
    .set({
      status: "completed",
      finishedAt,
      flightDurationSeconds: durationSeconds,
    })
    .where(eq(timetableTable.id, entry.id))
    .returning();

  const entries = await getTimetableWithFlights(req.session.userId);
  const result = entries.find((e) => e.id === updated.id);

  res.json(FinishFlightResponse.parse(result));
});

router.delete("/timetable/:id", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RemoveFromTimetableParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Check if requesting user is admin
  const [currentUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));
  const isAdmin = currentUser?.isAdmin === "true";

  // Admins can delete any entry; pilots can only delete their own
  const [entry] = await db
    .select()
    .from(timetableTable)
    .where(
      isAdmin
        ? eq(timetableTable.id, params.data.id)
        : and(
            eq(timetableTable.id, params.data.id),
            eq(timetableTable.userId, req.session.userId),
          ),
    );

  if (!entry) {
    res.status(404).json({ error: "Timetable entry not found" });
    return;
  }

  // Pilots cannot delete completed log entries — only admins can
  if (entry.status === "completed" && !isAdmin) {
    res.status(403).json({ error: "Only admins can remove completed flight logs" });
    return;
  }

  await db.delete(timetableTable).where(eq(timetableTable.id, entry.id));
  res.sendStatus(204);
});

export default router;
