<script setup>
import { computed, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { state, signInAdmin } from "../store/index.js";

const router = useRouter();
const isSubmitting = shallowRef(false);

const canSubmit = computed(() => !isSubmitting.value && !!state.adminPass);

async function login() {
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  const result = await signInAdmin(state.adminEmail, state.adminPass);
  isSubmitting.value = false;

  if (result.ok) {
    router.push("/admin");
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
    <Button class="fixed left-4 top-4" variant="outline" size="icon" title="Back" @click="$router.push('/')">
      <ArrowLeft />
    </Button>

    <Card class="w-full max-w-md">
      <CardHeader class="items-center text-center">
        <img class="size-14 rounded-lg border border-border object-cover" src="/bphs-logo.jpg" alt="BPHS" />
        <div class="flex flex-col gap-1">
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in to manage ballots, candidates, and results.</CardDescription>
        </div>
      </CardHeader>

      <CardContent class="flex flex-col gap-4">
        <label class="flex flex-col gap-2 text-sm font-medium">
          Email
          <div class="relative">
            <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="state.adminEmail"
              class="pl-10"
              type="email"
              placeholder="Admin email"
              autocomplete="email"
              @keydown.enter="login"
            />
          </div>
        </label>

        <label class="flex flex-col gap-2 text-sm font-medium">
          Password
          <div class="relative">
            <LockKeyhole class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="state.adminPass"
              class="pl-10"
              type="password"
              placeholder="Admin password"
              autocomplete="current-password"
              @keydown.enter="login"
            />
          </div>
        </label>

        <Alert v-if="state.adminLoginError" variant="destructive">
          <LockKeyhole />
          <AlertTitle>Unable to sign in</AlertTitle>
          <AlertDescription>{{ state.adminLoginError }}</AlertDescription>
        </Alert>

        <Alert v-if="state.adminSetupWarning">
          <ShieldCheck />
          <AlertTitle>Setup warning</AlertTitle>
          <AlertDescription>{{ state.adminSetupWarning }}</AlertDescription>
        </Alert>

        <Button class="w-full" :disabled="!canSubmit" @click="login">
          {{ isSubmitting ? "Signing in..." : "Login" }}
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
