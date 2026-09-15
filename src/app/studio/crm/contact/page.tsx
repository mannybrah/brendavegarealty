"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ContactBundle, ContactRow, RelationshipFull, TagRow, TagWithCount } from "@/lib/crm/types";
import { displayName } from "@/lib/crm/format";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { Card, ErrorText, SegmentedTabs, Spinner, crmFetch, crmJson } from "@/components/studio/crm/ui";
import type { TagOption } from "@/components/studio/crm/TagPicker";
import { NavArrows, ProfileHeader, ProfileMenu, useProfileNav } from "@/components/studio/crm/profile/ProfileHeader";
import { IdentityCard } from "@/components/studio/crm/profile/IdentityCard";
import { EditContactSheet } from "@/components/studio/crm/profile/EditContactSheet";
import { RelationshipsCard } from "@/components/studio/crm/profile/RelationshipsCard";
import { RelationshipSheet } from "@/components/studio/crm/profile/RelationshipSheet";
import { DetailsCard } from "@/components/studio/crm/profile/DetailsCard";
import { Composer, type SetEvents } from "@/components/studio/crm/profile/Composer";
import { Timeline } from "@/components/studio/crm/profile/Timeline";
import { TasksCard, type SetTasks } from "@/components/studio/crm/profile/TasksCard";
import { DealsCard } from "@/components/studio/crm/profile/DealsCard";
import { StartDealSheet } from "@/components/studio/crm/profile/StartDealSheet";

type MobileTab = "timeline" | "details" | "tasks";
const TAB_KEY = "crm.profileTab";
const MOBILE_TABS: { key: MobileTab; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "details", label: "Details" },
  { key: "tasks", label: "Tasks & Deals" },
];

function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return match;
}

function Loading() {
  return (
    <div className="py-16 flex justify-center">
      <Spinner />
    </div>
  );
}

export default function ContactPage() {
  // The fallback deliberately does NOT mount a CrmShell: the resolved child
  // mounts its own, and two shells per load means /api/studio/auth and
  // /api/studio/crm/stages are fetched twice on every profile visit.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ContactProfile />
    </Suspense>
  );
}

function ContactProfile() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { backHref, position, goPrev, goNext } = useProfileNav(id);
  const isMd = useMinWidth(768);
  const isLg = useMinWidth(1024);

  const [data, setData] = useState<ContactBundle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [tab, setTabState] = useState<MobileTab>("timeline");

  const [editOpen, setEditOpen] = useState(false);
  const [relSheet, setRelSheet] = useState<{ open: boolean; rel: RelationshipFull | null }>({ open: false, rel: null });
  const [dealOpen, setDealOpen] = useState(false);

  // ---- data ------------------------------------------------
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await crmFetch(`/api/studio/crm/contacts/${id}`);
      if (r.status === 404) {
        setNotFound(true);
        return;
      }
      if (!r.ok) throw new Error("Couldn't load this contact.");
      const j = (await r.json()) as ContactBundle;
      setNotFound(false);
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load this contact.");
    }
  }, [id]);

  const loadTags = useCallback(async () => {
    try {
      const j = await crmJson<{ tags: TagWithCount[] }>("/api/studio/crm/tags");
      setAllTags(j.tags ?? []);
    } catch {
      /* tags are a nicety; the picker still works with what it has */
    }
  }, []);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    setErr(null);
    window.scrollTo(0, 0);
    load();
  }, [id, load]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(TAB_KEY);
      if (v === "timeline" || v === "details" || v === "tasks") setTabState(v);
    } catch {
      /* private mode */
    }
  }, []);

  function setTab(t: MobileTab) {
    setTabState(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  }

  // ---- mutations -----------------------------------------
  const patchContact = useCallback(
    async (body: Record<string, unknown>) => {
      const j = await crmJson<{ contact: ContactRow; tags: TagRow[] }>(`/api/studio/crm/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setData((d) => (d ? { ...d, contact: j.contact, tags: j.tags } : d));
      if (Array.isArray(body.tags)) loadTags();
    },
    [id, loadTags]
  );

  async function changeStage(stageId: string) {
    if (!data || stageId === data.contact.stage) return;
    const prev = data.contact;
    setErr(null);
    setData((d) => (d ? { ...d, contact: { ...d.contact, stage: stageId } } : d));
    try {
      await patchContact({ stage: stageId });
      load(); // picks up the stage_change timeline event
    } catch (e) {
      setData((d) => (d ? { ...d, contact: prev } : d));
      setErr(e instanceof Error ? e.message : "Couldn't change the stage. Try again.");
    }
  }

  async function deleteContact() {
    if (!data) return;
    const name = displayName(data.contact.first_name, data.contact.last_name);
    if (!confirm(`Delete ${name} permanently? This removes their timeline, tasks and deals and can't be undone.`)) return;
    try {
      await crmJson(`/api/studio/crm/contacts/${id}`, { method: "DELETE" });
      router.push(backHref);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete. Try again.");
    }
  }

  const setEvents: SetEvents = useCallback((fn) => setData((d) => (d ? { ...d, events: fn(d.events) } : d)), []);
  const setTasks: SetTasks = useCallback((fn) => setData((d) => (d ? { ...d, tasks: fn(d.tasks) } : d)), []);

  // ---- header pieces --------------------------------------
  const name = data ? displayName(data.contact.first_name, data.contact.last_name) : "Contact";
  const mobileActions = data ? (
    <>
      <NavArrows position={position} onPrev={goPrev} onNext={goNext} tone="dark" />
      <ProfileMenu archived={data.contact.stage === "archived"} onTrash={() => changeStage("archived")} onDelete={deleteContact} tone="dark" />
    </>
  ) : undefined;

  // ---- states ---------------------------------------------
  if (!id) {
    return (
      <CrmShell title="Contact" backHref="/studio/crm/people">
        <ErrorText>Missing contact id.</ErrorText>
      </CrmShell>
    );
  }
  if (notFound) {
    return (
      <CrmShell title="Contact" backHref={backHref}>
        <div className="space-y-4 py-8">
          <div className="font-body text-sm text-charcoal-light">This contact doesn&apos;t exist anymore.</div>
          <Link href={backHref} className="font-ui text-xs tracking-wider uppercase text-teal">
            ← Back to people
          </Link>
        </div>
      </CrmShell>
    );
  }
  if (!data) {
    return (
      <CrmShell backHref={backHref}>
        <ErrorText>{err}</ErrorText>
        {!err && <Loading />}
      </CrmShell>
    );
  }

  const { contact, phones, emails, relationships, tags, events, tasks, deals } = data;

  // ---- cards ----------------------------------------------
  const identity = <IdentityCard contact={contact} phones={phones} emails={emails} onEdit={() => setEditOpen(true)} />;
  const relationshipsCard = (
    <RelationshipsCard
      relationships={relationships}
      onAdd={() => setRelSheet({ open: true, rel: null })}
      onEdit={(rel) => setRelSheet({ open: true, rel })}
    />
  );
  const details = <DetailsCard contact={contact} tags={tags} allTags={allTags} patchContact={patchContact} onStageChange={changeStage} />;
  const composer = <Composer contactId={id} setEvents={setEvents} onLogged={load} />;
  const timeline = (
    <Card className="p-4">
      <Timeline events={events} setEvents={setEvents} onChanged={load} />
    </Card>
  );
  const tasksCard = <TasksCard contactId={id} tasks={tasks} setTasks={setTasks} onTaskDone={load} />;
  const dealsCard = <DealsCard deals={deals} onStart={() => setDealOpen(true)} />;

  const sheets = (
    <>
      <EditContactSheet open={editOpen} contact={contact} phones={phones} emails={emails} onClose={() => setEditOpen(false)} onSaved={load} />
      <RelationshipSheet
        open={relSheet.open}
        contactId={id}
        relationship={relSheet.rel}
        onClose={() => setRelSheet((s) => ({ ...s, open: false }))}
        onSaved={load}
      />
      <StartDealSheet
        open={dealOpen}
        contactId={id}
        defaultSide={contact.type === "seller" ? "seller" : "buyer"}
        onClose={() => setDealOpen(false)}
        onCreated={(dealId) => router.push(`/studio/crm/deal?id=${dealId}`)}
      />
    </>
  );

  // ---- layouts --------------------------------------------
  let body: React.ReactNode;
  if (isLg) {
    body = (
      <div className="space-y-6">
        <ProfileHeader
          contact={contact}
          backHref={backHref}
          position={position}
          onPrev={goPrev}
          onNext={goNext}
          onTrash={() => changeStage("archived")}
          onDelete={deleteContact}
        />
        <div className="lg:grid lg:grid-cols-[300px_1fr_300px] lg:gap-6 lg:items-start">
          <div className="space-y-4">
            {identity}
            {relationshipsCard}
            {details}
          </div>
          <div className="space-y-4 min-w-0">
            <Card className="p-4">{composer}</Card>
            {timeline}
          </div>
          <div className="space-y-4">
            {tasksCard}
            {dealsCard}
          </div>
        </div>
      </div>
    );
  } else if (isMd) {
    body = (
      <div className="md:grid md:grid-cols-[300px_1fr] md:gap-6 md:items-start">
        <div className="space-y-4 md:col-start-1">
          {identity}
          {relationshipsCard}
          {details}
          {tasksCard}
          {dealsCard}
        </div>
        <div className="space-y-4 min-w-0">
          <Card className="p-4">{composer}</Card>
          {timeline}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        {identity}
        <SegmentedTabs tabs={MOBILE_TABS} value={tab} onChange={setTab} />
        {tab === "timeline" && (
          <div className="space-y-4">
            {timeline}
            <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 bg-cream border-t border-navy/10 -mx-4 px-4 pt-3 pb-3">
              {composer}
            </div>
          </div>
        )}
        {tab === "details" && (
          <div className="space-y-4">
            {relationshipsCard}
            {details}
          </div>
        )}
        {tab === "tasks" && (
          <div className="space-y-4">
            {tasksCard}
            {dealsCard}
          </div>
        )}
      </div>
    );
  }

  return (
    <CrmShell title={name} backHref={backHref} actions={mobileActions}>
      {err && (
        <div className="mb-4">
          <ErrorText>{err}</ErrorText>
        </div>
      )}
      {body}
      {sheets}
    </CrmShell>
  );
}
