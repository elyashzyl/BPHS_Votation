<script setup>
import { computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { LockKeyhole, MonitorCog, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { state, getSettings, toggleTheme } from "../store/index.js";

const router = useRouter();
const closedMessage = shallowRef("");

const electionTitle = computed(() => state.data?.settings?.title || "SBO Election");
const modeLabel = computed(() => (state.isDark ? "Dark mode" : "Light mode"));

const votingOptions = computed(() => [
  {
    id: "sbo",
    title: "Vote SBO",
    description: "Choose the student body officers for the school year.",
    activeKey: "sboActive",
    icon: ShieldCheck,
    badge: "Schoolwide",
  },
  {
    id: "classroom",
    title: "Vote Classroom",
    description: "Vote for officers in your grade and section.",
    activeKey: "classroomActive",
    icon: UsersRound,
    badge: "By section",
  },
  {
    id: "club",
    title: "Vote Club Officers",
    description: "Select the officers for your club.",
    activeKey: "clubActive",
    icon: Trophy,
    badge: "By club",
  },
]);

function goVote(option) {
  const settings = getSettings();
  if (!settings[option.activeKey]) {
    closedMessage.value = `${option.title.replace("Vote ", "")} voting is currently closed.`;
    return;
  }

  closedMessage.value = "";
  state.electionType = option.id;
  router.push("/vote/login");
}

function goAdmin() {
  router.push("/admin/login");
}
</script>

<template>
  <main class="min-h-screen bg-background px-4 py-8 text-foreground md:px-8">
    <section class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="flex max-w-3xl flex-col gap-4">
          <div class="flex items-center gap-3">
            <img class="size-14 rounded-lg border border-border object-cover" src="/bphs-logo.jpg" alt="BPHS" />
            <div>
              <Badge variant="outline">School Year {{ state.year }}</Badge>
              <h1 class="mt-2 text-3xl font-semibold leading-tight md:text-5xl">
                Baguio Patriotic High School
              </h1>
            </div>
          </div>
          <p class="text-base text-muted-foreground md:text-lg">
            {{ electionTitle }} voting portal
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" @click="toggleTheme">
            <Sparkles data-icon="inline-start" />
            {{ modeLabel }}
          </Button>
          <Button variant="secondary" @click="goAdmin">
            <MonitorCog data-icon="inline-start" />
            Admin
          </Button>
        </div>
      </div>

      <Alert v-if="closedMessage" variant="destructive">
        <LockKeyhole />
        <AlertTitle>Voting closed</AlertTitle>
        <AlertDescription>{{ closedMessage }}</AlertDescription>
      </Alert>

      <div class="grid gap-4 md:grid-cols-3">
        <Card
          v-for="option in votingOptions"
          :key="option.id"
          class="cursor-pointer transition hover:-translate-y-1 hover:ring-primary/40"
          role="button"
          tabindex="0"
          @click="goVote(option)"
          @keydown.enter.prevent="goVote(option)"
        >
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <div class="rounded-lg border border-border bg-muted p-2">
                <component :is="option.icon" />
              </div>
              <Badge variant="secondary">{{ option.badge }}</Badge>
            </div>
            <CardTitle>{{ option.title }}</CardTitle>
            <CardDescription>{{ option.description }}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button class="w-full" variant="outline">
              Start ballot
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
</template>
