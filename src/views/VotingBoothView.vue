<script setup>
import { computed, onMounted, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import { CheckCircle2, CircleDashed, LogOut, RotateCcw } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Device } from "../utils/device.js";
import { state, getActiveCandidates, getActivePositions } from "../store/index.js";

const router = useRouter();
const type = computed(() => state.electionType || "sbo");
const positions = computed(() => getActivePositions(type.value));
const completedCount = computed(() => positions.value.filter((pos) => isDone(pos.id)).length);
const progressPct = computed(() =>
  positions.value.length ? Math.round((completedCount.value / positions.value.length) * 100) : 0,
);
const skippedPositions = computed(() => positions.value.filter((pos) => !isDone(pos.id)));
const maxMessage = shallowRef("");

const electionLabel = computed(() => {
  if (type.value === "classroom") return "Classroom Election";
  if (type.value === "club") return "Club Election";
  return "SBO Election";
});

const voterMeta = computed(() => {
  const parts = [`Grade ${state.voter.grade}`, state.voter.section].filter(Boolean);
  if (state.electionType === "club" && state.voter.club) parts.push(state.voter.club);
  return parts.join(" - ");
});

const draftKey = `sbo_draft_${Device.getId()}_${state.electionType}`;

onMounted(() => {
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.selectedVotes = { ...state.selectedVotes, ...parsed };
    }
  } catch {}
});

watch(
  () => state.selectedVotes,
  (value) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(value));
    } catch {}
  },
  { deep: true },
);

function clearDraft() {
  try {
    localStorage.removeItem(draftKey);
  } catch {}
}

function cands(posId) {
  return getActiveCandidates(posId, state.voter);
}

function isSel(candId, posId) {
  return (state.selectedVotes[posId] || []).includes(candId);
}

function isDone(posId) {
  return (state.selectedVotes[posId] || []).length > 0;
}

function clearPosition(posId) {
  state.selectedVotes[posId] = [];
  state.selectedVotes = { ...state.selectedVotes };
}

function toggle(candId, posId, max) {
  maxMessage.value = "";
  const current = state.selectedVotes[posId] || [];

  if (current.includes(candId)) {
    state.selectedVotes[posId] = current.filter((id) => id !== candId);
    state.selectedVotes = { ...state.selectedVotes };
    return;
  }

  if (max === 1) {
    state.selectedVotes[posId] = [candId];
    state.selectedVotes = { ...state.selectedVotes };
    return;
  }

  if (current.length >= max) {
    maxMessage.value = `You can select up to ${max} candidate${max > 1 ? "s" : ""} for this position.`;
    return;
  }

  state.selectedVotes[posId] = [...current, candId];
  state.selectedVotes = { ...state.selectedVotes };
}

function goHome() {
  clearDraft();
  router.push("/");
}

function goConfirmation() {
  router.push("/vote/confirm");
}
</script>

<template>
  <main class="min-h-screen bg-background px-4 py-4 text-foreground md:px-8 md:py-6">
    <form class="mx-auto flex w-full max-w-6xl flex-col gap-4" @submit.prevent="goConfirmation">
      <Card class="sticky top-3 z-20 shadow-sm">
        <CardContent class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {{ (state.voter.name || "?").charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="truncate">{{ state.voter.name }}</strong>
                <Badge variant="secondary">{{ electionLabel }}</Badge>
              </div>
              <p class="text-sm text-muted-foreground">{{ voterMeta }}</p>
            </div>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-2 md:max-w-sm">
            <div class="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{{ completedCount }} of {{ positions.length }} positions completed</span>
              <span>{{ progressPct }}%</span>
            </div>
            <Progress :model-value="progressPct" />
          </div>

          <Button type="button" variant="outline" @click="goHome">
            <LogOut data-icon="inline-start" />
            Cancel
          </Button>
        </CardContent>
      </Card>

      <Alert v-if="maxMessage" variant="destructive">
        <CircleDashed />
        <AlertTitle>Selection limit reached</AlertTitle>
        <AlertDescription>{{ maxMessage }}</AlertDescription>
      </Alert>

      <Card v-for="position in positions" :key="position.id">
        <CardHeader>
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle class="flex items-center gap-2">
                {{ position.name }}
                <CheckCircle2 v-if="isDone(position.id)" class="text-primary" />
              </CardTitle>
              <CardDescription>
                {{ position.maxVote > 1 ? `Select up to ${position.maxVote}` : "Select one candidate" }}
              </CardDescription>
            </div>
            <Badge :variant="isDone(position.id) ? 'default' : 'outline'">
              {{ isDone(position.id) ? "Selected" : "Open" }}
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="flex flex-col gap-3">
          <p v-if="!cands(position.id).length" class="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No candidates are available for this position.
          </p>

          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="candidate in cands(position.id)"
              :key="candidate.id"
              type="button"
              class="flex min-h-32 items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              :class="{ 'border-primary bg-muted ring-2 ring-primary/20': isSel(candidate.id, position.id) }"
              @click="toggle(candidate.id, position.id, position.maxVote)"
            >
              <img
                v-if="candidate.image"
                class="size-14 shrink-0 rounded-lg object-cover"
                :src="candidate.image"
                :alt="candidate.name"
              />
              <div
                v-else
                class="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-semibold"
              >
                {{ candidate.name.charAt(0).toUpperCase() }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-semibold">{{ candidate.name }}</span>
                  <CheckCircle2 v-if="isSel(candidate.id, position.id)" class="shrink-0 text-primary" />
                </div>
                <p v-if="candidate.party" class="text-sm text-muted-foreground">{{ candidate.party }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ candidate.grade ? "Grade " + candidate.grade : "" }}{{ candidate.section ? " - " + candidate.section : "" }}
                </p>
              </div>
            </button>
          </div>

          <div v-if="isDone(position.id)" class="flex justify-end">
            <Button type="button" size="sm" variant="outline" @click="clearPosition(position.id)">
              <RotateCcw data-icon="inline-start" />
              Clear selection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert v-if="skippedPositions.length">
        <CircleDashed />
        <AlertTitle>{{ skippedPositions.length }} skipped position{{ skippedPositions.length > 1 ? "s" : "" }}</AlertTitle>
        <AlertDescription>
          {{ skippedPositions.map((position) => position.name).join(", ") }}
        </AlertDescription>
      </Alert>

      <div class="sticky bottom-3 z-20 flex justify-end">
        <Button type="submit" size="lg">
          Review My Vote
        </Button>
      </div>
    </form>
  </main>
</template>
