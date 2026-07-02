<script setup>
import { computed, reactive, shallowRef, watch } from "vue";
import { ArchiveRestore, Edit3, Moon, RotateCcw, Search, Trash2 } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  createPosition,
  getCandidates,
  getPositions,
  removePosition,
  removePositions,
  restorePosition,
  state,
  toggleTheme,
  updatePosition,
} from "../store/index.js";
import ModalDialog from "./ModalDialog.vue";

const positionTypes = [
  { value: "sbo", label: "SBO" },
  { value: "classroom", label: "Classroom" },
  { value: "club", label: "Club" },
];

const posType = shallowRef(state.candTabType || "sbo");
const query = shallowRef("");
const showArchived = shallowRef(false);
const selected = reactive(new Set());
const editingId = shallowRef("");
const deleteTarget = shallowRef(null);
const showBulkDelete = shallowRef(false);
const notice = shallowRef("");
const formError = shallowRef("");

const form = reactive({
  name: "",
  type: "sbo",
  order: 1,
  maxVote: 1,
  filterByGrade: false,
});

watch(posType, (value) => {
  state.candTabType = value;
  selected.clear();
});

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return getPositions()
    .filter((position) => (position.type || "sbo") === posType.value)
    .filter((position) => showArchived.value || !position.archived)
    .filter((position) => !needle || position.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
});

const selectedItems = computed(() => filtered.value.filter((position) => selected.has(position.id)));
const currentTypeLabel = computed(
  () => positionTypes.find((type) => type.value === posType.value)?.label || "SBO",
);

function candidateCount(id) {
  return getCandidates(id).length;
}

function resetForm() {
  editingId.value = "";
  form.name = "";
  form.type = posType.value;
  form.order =
    Math.max(
      0,
      ...getPositions()
        .filter((position) => (position.type || "sbo") === posType.value)
        .map((position) => Number(position.order || 0)),
    ) + 1;
  form.maxVote = 1;
  form.filterByGrade = false;
  formError.value = "";
}

function editPosition(position) {
  editingId.value = position.id;
  form.name = position.name;
  form.type = position.type || "sbo";
  form.order = position.order;
  form.maxVote = position.maxVote;
  form.filterByGrade = !!position.filterByGrade;
  formError.value = "";
}

async function saveForm() {
  try {
    const result = await (editingId.value ? updatePosition(editingId.value, form) : createPosition(form));
    if (!result.ok) {
      formError.value = result.error;
      return;
    }

    notice.value = editingId.value ? "Position updated." : "Position added.";
    posType.value = form.type;
    resetForm();
  } catch (error) {
    console.error("Save form error:", error);
    formError.value = error.message || "Failed to save position. Please try again.";
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  try {
    const result = await removePosition(deleteTarget.value.id);
    notice.value =
      result.action === "archived"
        ? "Position archived because it already has votes."
        : "Position deleted.";
    selected.delete(deleteTarget.value.id);
    deleteTarget.value = null;
  } catch (error) {
    console.error("Delete position error:", error);
    notice.value = error.message || "Failed to delete position. Please try again.";
  }
}

async function confirmBulkDelete() {
  try {
    const ids = selectedItems.value.map((position) => position.id);
    const result = await removePositions(ids);
    notice.value = `${result.deleted} deleted, ${result.archived} archived.`;
    selected.clear();
    showBulkDelete.value = false;
  } catch (error) {
    console.error("Bulk delete error:", error);
    notice.value = error.message || "Failed to delete positions. Please try again.";
  }
}

async function restore(id) {
  await restorePosition(id);
  notice.value = "Position restored.";
}

function toggle(id) {
  selected.has(id) ? selected.delete(id) : selected.add(id);
}

function toggleAll(checked) {
  selected.clear();
  if (checked) filtered.value.forEach((position) => selected.add(position.id));
}

resetForm();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Positions</h2>
        <p class="text-sm text-muted-foreground">
          Create, archive, restore, and order election positions.
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
          <CardTitle>{{ editingId ? "Edit Position" : "Add Position" }}</CardTitle>
          <CardDescription>
            Positions define each ballot section and how many students can select.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <label class="flex flex-col gap-2 text-sm font-medium">
            Name
            <Input v-model="form.name" type="text" placeholder="Position name" />
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Type
              <Select v-model="form.type">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="type in positionTypes" :key="type.value" :value="type.value">
                      {{ type.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label class="flex flex-col gap-2 text-sm font-medium">
              Order
              <Input v-model="form.order" type="number" min="1" />
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Max Vote
              <Input v-model="form.maxVote" type="number" min="1" />
            </label>

            <label class="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium">
              <Checkbox
                :model-value="form.filterByGrade"
                @update:model-value="(value) => (form.filterByGrade = !!value)"
              />
              Grade-scoped
            </label>
          </div>

          <Alert v-if="formError" variant="destructive">
            <Trash2 />
            <AlertTitle>Check position details</AlertTitle>
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>

          <div class="flex flex-wrap gap-2">
            <Button size="sm" @click="saveForm">{{ editingId ? "Save" : "Add" }}</Button>
            <Button size="sm" variant="outline" @click="resetForm">
              <RotateCcw data-icon="inline-start" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>{{ currentTypeLabel }} Positions</CardTitle>
              <CardDescription>{{ filtered.length }} visible position{{ filtered.length === 1 ? "" : "s" }}</CardDescription>
            </div>
            <div class="flex flex-col gap-2 md:flex-row md:items-center">
              <Tabs v-model="posType" class="w-full md:w-auto">
                <TabsList class="grid w-full grid-cols-3 md:w-80">
                  <TabsTrigger value="sbo">SBO</TabsTrigger>
                  <TabsTrigger value="classroom">Classroom</TabsTrigger>
                  <TabsTrigger value="club">Club</TabsTrigger>
                </TabsList>
              </Tabs>
              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input v-model="query" class="pl-10 md:w-56" type="text" placeholder="Search positions" />
              </div>
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
                      :model-value="selected.size === filtered.length && filtered.length > 0"
                      @update:model-value="toggleAll"
                    />
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="position in filtered"
                  :key="position.id"
                  :data-state="selected.has(position.id) ? 'selected' : undefined"
                >
                  <TableCell>
                    <Checkbox
                      :model-value="selected.has(position.id)"
                      @update:model-value="() => toggle(position.id)"
                    />
                  </TableCell>
                  <TableCell>{{ position.order }}</TableCell>
                  <TableCell class="font-medium">{{ position.name }}</TableCell>
                  <TableCell>{{ position.maxVote }}</TableCell>
                  <TableCell>{{ candidateCount(position.id) }}</TableCell>
                  <TableCell>
                    <Badge :variant="position.archived ? 'destructive' : 'secondary'">
                      {{ position.archived ? "Archived" : "Active" }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="outline" @click="editPosition(position)">
                        <Edit3 data-icon="inline-start" />
                        Edit
                      </Button>
                      <Button v-if="position.archived" size="sm" variant="secondary" @click="restore(position.id)">
                        Restore
                      </Button>
                      <Button v-else size="sm" variant="destructive" @click="deleteTarget = position">
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!filtered.length">
                  <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
                    No positions found.
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
      title="Delete Position"
      :message="deleteTarget ? `Delete or archive ${deleteTarget.name}? Positions with votes are archived to preserve results.` : ''"
      confirmText="Continue"
      confirmClass="btn-danger"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
    <ModalDialog
      :visible="showBulkDelete"
      title="Delete Positions"
      message="Delete positions without votes and archive positions with votes?"
      confirmText="Continue"
      confirmClass="btn-danger"
      @confirm="confirmBulkDelete"
      @cancel="showBulkDelete = false"
    />
  </div>
</template>
