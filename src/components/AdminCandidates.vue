<script setup>
import { computed, reactive, shallowRef, watch } from "vue";
import { ArchiveRestore, Camera, Edit3, Moon, RotateCcw, Search, Trash2 } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createCandidate,
  getClubs,
  getPositions,
  getSections,
  getSettings,
  removeCandidate,
  removeCandidates,
  restoreCandidate,
  setCandidatePhoto,
  state,
  toggleTheme,
  updateCandidate,
} from "../store/index.js";
import ModalDialog from "./ModalDialog.vue";

const candidateTypes = [
  { value: "sbo", label: "SBO" },
  { value: "classroom", label: "Classroom" },
  { value: "club", label: "Club" },
];

const type = shallowRef(state.candTabType || "sbo");
const filterPos = shallowRef("all");
const query = shallowRef("");
const showArchived = shallowRef(false);
const selected = reactive(new Set());
const editingId = shallowRef("");
const deleteTarget = shallowRef(null);
const showBulkDelete = shallowRef(false);
const notice = shallowRef("");
const formError = shallowRef("");

const form = reactive({
  positionId: "",
  name: "",
  grade: "7",
  section: "",
  party: "",
  club: "",
});

const settings = computed(() => getSettings());
const clubs = computed(() => getClubs());
const positions = computed(() =>
  getPositions().filter((position) => (position.type || "sbo") === type.value && !position.archived),
);
const positionFilterOptions = computed(() => [
  { value: "all", label: "All Positions" },
  ...positions.value.map((position) => ({ value: position.id, label: position.name })),
]);
const selectedFormPosition = computed(() =>
  getPositions().find((position) => position.id === form.positionId),
);
const currentTypeLabel = computed(
  () => candidateTypes.find((candidateType) => candidateType.value === type.value)?.label || "SBO",
);

const filteredCandidates = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const positionIds = new Set(positions.value.map((position) => position.id));

  return (state.data?.candidates || [])
    .filter((candidate) => positionIds.has(candidate.positionId))
    .filter((candidate) => showArchived.value || !candidate.archived)
    .filter((candidate) => filterPos.value === "all" || candidate.positionId === filterPos.value)
    .filter((candidate) =>
      !needle ||
      [candidate.name, candidate.party, candidate.grade, candidate.section, candidate.club]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
    .sort((a, b) => posName(a.positionId).localeCompare(posName(b.positionId)) || a.name.localeCompare(b.name));
});

watch(type, (value) => {
  state.candTabType = value;
  filterPos.value = "all";
  selected.clear();
  resetForm();
});

watch(
  positions,
  () => {
    if (!positions.value.some((position) => position.id === form.positionId)) {
      form.positionId = positions.value[0]?.id || "";
    }
    if (filterPos.value !== "all" && !positions.value.some((position) => position.id === filterPos.value)) {
      filterPos.value = "all";
    }
  },
  { immediate: true },
);

function posName(posId) {
  return getPositions().find((position) => position.id === posId)?.name || "-";
}

function sectionsForGrade(grade) {
  return getSections(grade);
}

function candidateInitial(candidate) {
  return (candidate.name || "?").charAt(0).toUpperCase();
}

function scopeLabel(candidate) {
  const parts = [];
  if (candidate.grade) parts.push(`Grade ${candidate.grade}`);
  if (candidate.section) parts.push(candidate.section);
  if (candidate.club) parts.push(candidate.club);
  return parts.join(" - ") || "All eligible voters";
}

function resetForm() {
  editingId.value = "";
  form.positionId = filterPos.value !== "all" ? filterPos.value : positions.value[0]?.id || "";
  form.name = "";
  form.grade = settings.value.grades[0] || "7";
  form.section = "all";
  form.party = "";
  form.club = "all";
  formError.value = "";
}

function editCandidate(candidate) {
  editingId.value = candidate.id;
  form.positionId = candidate.positionId;
  form.name = candidate.name;
  form.grade = candidate.grade || settings.value.grades[0] || "7";
  form.section = candidate.section || "all";
  form.party = candidate.party || "";
  form.club = candidate.club || "all";
  formError.value = "";
}

async function saveForm() {
  const payload = {
    ...form,
    section: form.section === "all" ? "" : form.section,
    club: form.club === "all" ? "" : form.club,
  };
  try {
    const result = await (editingId.value ? updateCandidate(editingId.value, payload) : createCandidate(payload));
    if (!result.ok) {
      formError.value = result.error;
      return;
    }

    notice.value = editingId.value ? "Candidate updated." : "Candidate added.";
    resetForm();
  } catch (error) {
    console.error("Save form error:", error);
    formError.value = error.message || "Failed to save candidate. Please try again.";
  }
}

function uploadPhoto(id) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notice.value = "Photo is too large. Maximum size is 10MB.";
      return;
    }
    setCandidatePhoto(id, file)
      .then((result) => {
        if (!result.ok) {
          notice.value = result.error;
          return;
        }
        notice.value = result.storage === "supabase"
          ? "Photo uploaded to Supabase Storage."
          : "Photo saved locally for demo mode.";
      })
      .catch((error) => {
        notice.value = error.message || "Unable to upload photo.";
      });
  };
  input.click();
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  try {
    const result = await removeCandidate(deleteTarget.value.id);
    notice.value =
      result.action === "archived"
        ? "Candidate archived because they already have votes."
        : "Candidate deleted.";
    selected.delete(deleteTarget.value.id);
    deleteTarget.value = null;
  } catch (error) {
    console.error("Delete candidate error:", error);
    notice.value = error.message || "Failed to delete candidate. Please try again.";
  }
}

async function confirmBulkDelete() {
  try {
    const ids = filteredCandidates.value
      .filter((candidate) => selected.has(candidate.id))
      .map((candidate) => candidate.id);
    const result = await removeCandidates(ids);
    notice.value = `${result.deleted} deleted, ${result.archived} archived.`;
    selected.clear();
    showBulkDelete.value = false;
  } catch (error) {
    console.error("Bulk delete error:", error);
    notice.value = error.message || "Failed to delete candidates. Please try again.";
  }
}

async function restore(id) {
  try {
    await restoreCandidate(id);
    notice.value = "Candidate restored.";
  } catch (error) {
    console.error("Restore candidate error:", error);
    notice.value = error.message || "Failed to restore candidate. Please try again.";
  }
}

function toggle(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id);
}

function toggleAll(checked) {
  selected.clear();
  if (checked) filteredCandidates.value.forEach((candidate) => selected.add(candidate.id));
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Candidates</h2>
        <p class="text-sm text-muted-foreground">
          Manage candidates by election type, position, and voting scope.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Badge variant="outline">{{ state.year }}</Badge>
        <Button variant="outline" size="sm" @click="toggleTheme">
          <Moon data-icon="inline-start" />
          Theme
        </Button>
      </div>
    </div>

    <Alert v-if="notice">
      <ArchiveRestore />
      <AlertTitle>Saved</AlertTitle>
      <AlertDescription>{{ notice }}</AlertDescription>
    </Alert>

    <div class="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card class="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>{{ editingId ? "Edit Candidate" : "Add Candidate" }}</CardTitle>
          <CardDescription>
            Candidates inherit their ballot scope from the selected position.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Alert v-if="!positions.length">
            <ArchiveRestore />
            <AlertTitle>No active positions</AlertTitle>
            <AlertDescription>Add an active position before creating candidates.</AlertDescription>
          </Alert>

          <template v-else>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Position
              <Select v-model="form.positionId">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="position in positions" :key="position.id" :value="position.id">
                      {{ position.name }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label class="flex flex-col gap-2 text-sm font-medium">
              Name
              <Input v-model="form.name" type="text" placeholder="Candidate name" />
            </label>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Grade
                <Select v-model="form.grade">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="grade in settings.grades" :key="grade" :value="grade">
                        Grade {{ grade }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <label v-if="selectedFormPosition?.type === 'classroom'" class="flex flex-col gap-2 text-sm font-medium">
                Section
                <Select v-model="form.section">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Any section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem v-for="section in sectionsForGrade(form.grade)" :key="section" :value="section">
                        {{ section }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label v-if="selectedFormPosition?.type === 'club'" class="flex flex-col gap-2 text-sm font-medium">
              Club
              <Select v-model="form.club">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Any club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem v-for="club in clubs" :key="club" :value="club">{{ club }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label class="flex flex-col gap-2 text-sm font-medium">
              Party
              <Input v-model="form.party" type="text" placeholder="Party or slate" />
            </label>

            <Alert v-if="formError" variant="destructive">
              <Trash2 />
              <AlertTitle>Check candidate details</AlertTitle>
              <AlertDescription>{{ formError }}</AlertDescription>
            </Alert>

            <div class="flex flex-wrap gap-2">
              <Button size="sm" @click="saveForm">{{ editingId ? "Save" : "Add" }}</Button>
              <Button size="sm" variant="outline" @click="resetForm">
                <RotateCcw data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex flex-col gap-3">
            <div>
              <CardTitle>{{ currentTypeLabel }} Candidates</CardTitle>
              <CardDescription>
                {{ filteredCandidates.length }} visible candidate{{ filteredCandidates.length === 1 ? "" : "s" }}
              </CardDescription>
            </div>
            <div class="grid gap-2 md:grid-cols-2 2xl:grid-cols-[320px_minmax(180px,1fr)_220px_auto]">
              <Tabs v-model="type" class="w-full md:w-auto">
                <TabsList class="grid w-full grid-cols-3">
                  <TabsTrigger value="sbo">SBO</TabsTrigger>
                  <TabsTrigger value="classroom">Classroom</TabsTrigger>
                  <TabsTrigger value="club">Club</TabsTrigger>
                </TabsList>
              </Tabs>

              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input v-model="query" class="w-full pl-10" type="text" placeholder="Search candidates" />
              </div>

              <Select v-if="positions.length" v-model="filterPos">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="option in positionFilterOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <label class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <Checkbox
                  :model-value="showArchived"
                  @update:model-value="(value) => (showArchived = !!value)"
                />
                Archived
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex flex-col gap-3">
          <div v-if="selected.size" class="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-sm text-muted-foreground">{{ selected.size }} selected</span>
            <Button size="sm" variant="destructive" @click="showBulkDelete = true">
              <Trash2 data-icon="inline-start" />
              Delete or archive
            </Button>
          </div>

          <div class="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-10">
                    <Checkbox
                      :model-value="selected.size === filteredCandidates.length && filteredCandidates.length > 0"
                      @update:model-value="toggleAll"
                    />
                  </TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="candidate in filteredCandidates"
                  :key="candidate.id"
                  :data-state="selected.has(candidate.id) ? 'selected' : undefined"
                >
                  <TableCell>
                    <Checkbox
                      :model-value="selected.has(candidate.id)"
                      @update:model-value="() => toggle(candidate.id)"
                    />
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-3">
                      <Avatar class="size-9 rounded-lg">
                        <AvatarImage v-if="candidate.image" :src="candidate.image" :alt="candidate.name" />
                        <AvatarFallback>{{ candidateInitial(candidate) }}</AvatarFallback>
                      </Avatar>
                      <span class="font-medium">{{ candidate.name }}</span>
                    </div>
                  </TableCell>
                  <TableCell>{{ posName(candidate.positionId) }}</TableCell>
                  <TableCell>{{ scopeLabel(candidate) }}</TableCell>
                  <TableCell>{{ candidate.party || "-" }}</TableCell>
                  <TableCell>
                    <Badge :variant="candidate.archived ? 'destructive' : 'secondary'">
                      {{ candidate.archived ? "Archived" : "Active" }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-2">
                      <Button size="icon-sm" variant="outline" title="Photo" aria-label="Photo" @click="uploadPhoto(candidate.id)">
                        <Camera />
                      </Button>
                      <Button size="icon-sm" variant="outline" title="Edit" aria-label="Edit" @click="editCandidate(candidate)">
                        <Edit3 />
                      </Button>
                      <Button v-if="candidate.archived" size="icon-sm" variant="secondary" title="Restore" aria-label="Restore" @click="restore(candidate.id)">
                        <ArchiveRestore />
                      </Button>
                      <Button v-else size="icon-sm" variant="destructive" title="Delete" aria-label="Delete" @click="deleteTarget = candidate">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!filteredCandidates.length">
                  <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
                    No candidates found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    <ModalDialog
      :visible="!!deleteTarget"
      title="Delete Candidate"
      :message="deleteTarget ? `Delete or archive ${deleteTarget.name}? Candidates with votes are archived to preserve results.` : ''"
      confirmText="Continue"
      confirmClass="btn-danger"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
    <ModalDialog
      :visible="showBulkDelete"
      title="Delete Candidates"
      message="Delete candidates without votes and archive candidates with votes?"
      confirmText="Continue"
      confirmClass="btn-danger"
      @confirm="confirmBulkDelete"
      @cancel="showBulkDelete = false"
    />
  </div>
</template>
