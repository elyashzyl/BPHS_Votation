import { supabase, sbInitialized } from "../supabase.js";

const DB_NAME = "SBO_Votation";
const STORE_NAME = "elections";
const LS_PREFIX = "sbo_";
const CANDIDATE_PHOTO_BUCKET = "candidate-photos";
const NORMALIZED_TABLE_SETUP =
  "Missing normalized Supabase tables. Run supabase/migrations/20260702010000_normalize_election_schema.sql in your Supabase SQL editor.";
const ELECTIONS_TABLE_SETUP =
  "Missing Supabase table. Run supabase/migrations/20260702000000_create_elections_table.sql in your Supabase SQL editor.";

function lsKey(year) {
  return LS_PREFIX + year;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function cleanStorageSegment(value) {
  return String(value || "item")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function imageExtension(contentType) {
  const extension = String(contentType || "").split("/")[1]?.toLowerCase() || "jpg";
  if (extension === "jpeg" || extension === "jpg") return "jpg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  if (extension === "gif") return "gif";
  return "jpg";
}

function candidatePhotoPath(year, candidateId, contentType = "image/jpeg") {
  return `candidates/${cleanStorageSegment(year)}/${cleanStorageSegment(candidateId)}.${imageExtension(contentType)}`;
}

function makeBallotId(voter) {
  return `bal_${voter.id}_${voter.electionType || "sbo"}`;
}

function normalizeSettings(row = {}) {
  return {
    title: row.title || "SBO Election",
    sboActive: row.sbo_active ?? true,
    classroomActive: row.classroom_active ?? true,
    clubActive: row.club_active ?? true,
    adminPassword: row.legacy_admin_password || "admin123",
    grades: row.grades || ["7", "8", "9", "10"],
    sectionsByGrade: row.sections_by_grade || {},
    clubs: row.clubs || [],
  };
}

function settingsToRow(year, settings = {}) {
  return {
    year,
    title: settings.title || "SBO Election",
    sbo_active: settings.sboActive ?? true,
    classroom_active: settings.classroomActive ?? true,
    club_active: settings.clubActive ?? true,
    grades: settings.grades || ["7", "8", "9", "10"],
    sections_by_grade: settings.sectionsByGrade || {},
    clubs: settings.clubs || [],
    legacy_admin_password: settings.adminPassword || null,
  };
}

function positionToRow(year, position) {
  return {
    id: position.id,
    year,
    name: position.name,
    election_type: position.type || "sbo",
    display_order: Number(position.order) || 1,
    max_vote: Number(position.maxVote) || 1,
    filter_by_grade: !!position.filterByGrade,
    archived: !!position.archived,
    archived_at: position.archivedAt || null,
  };
}

function rowToPosition(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.election_type || "sbo",
    order: row.display_order || 1,
    maxVote: row.max_vote || 1,
    filterByGrade: !!row.filter_by_grade,
    archived: !!row.archived,
    archivedAt: row.archived_at || "",
  };
}

function candidateToRow(year, candidate) {
  return {
    id: candidate.id,
    year,
    position_id: candidate.positionId,
    name: candidate.name,
    grade: candidate.grade || null,
    section: candidate.section || null,
    party: candidate.party || null,
    club: candidate.club || null,
    image: candidate.image || null,
    archived: !!candidate.archived,
    archived_at: candidate.archivedAt || null,
  };
}

function rowToCandidate(row) {
  return {
    id: row.id,
    positionId: row.position_id,
    name: row.name,
    grade: row.grade || "",
    section: row.section || "",
    party: row.party || "",
    club: row.club || "",
    image: row.image || "",
    archived: !!row.archived,
    archivedAt: row.archived_at || "",
  };
}

function voterToRow(year, voter) {
  return {
    id: voter.id,
    year,
    name: voter.name,
    name_key: (voter.name || "").trim().toLowerCase().replace(/\s+/g, " "),
    grade: voter.grade,
    section: voter.section || null,
    club: voter.club || null,
    device_id: voter.deviceId,
  };
}

function reportToRow(year, report) {
  return {
    id: report.id,
    year,
    name: report.name || null,
    message: report.message,
    election_type: report.electionType || null,
    device_id: report.deviceId || null,
    resolved: !!report.resolved,
    reply: report.reply || null,
    reply_timestamp: report.replyTimestamp || null,
    follow_ups: report.followUps || [],
    created_at: report.timestamp || new Date().toISOString(),
  };
}

function rowToReport(row) {
  return {
    id: row.id,
    name: row.name || "Anonymous",
    message: row.message,
    electionType: row.election_type || "",
    deviceId: row.device_id || "",
    resolved: !!row.resolved,
    reply: row.reply || "",
    replyTimestamp: row.reply_timestamp || "",
    followUps: row.follow_ups || [],
    timestamp: row.created_at,
  };
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

function formatSupabaseError(prefix, error, normalized = false) {
  if (isMissingTableError(error)) {
    return `${prefix}: ${normalized ? NORMALIZED_TABLE_SETUP : ELECTIONS_TABLE_SETUP}`;
  }
  return `${prefix}: ${error?.message || "Unknown Supabase error"}`;
}

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("*", { count: "exact", head: true });
  if (isMissingTableError(error)) return false;
  if (error) throw error;
  return true;
}

export const DB = {
  ready: false,
  initPromise: null,
  normalizedReady: false,
  syncStatus: "unknown",
  syncError: "",

  async open() {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (sbInitialized && supabase) {
        this.ready = true;
        try {
          this.normalizedReady = await tableExists("election_years");
        } catch (error) {
          this.normalizedReady = false;
          this.syncStatus = "error";
          this.syncError = formatSupabaseError("SCHEMA", error, true);
        }
      } else {
        console.warn("Supabase not configured, using local storage fallback.");
      }
      await this._openIDB();
    })();

    return this.initPromise;
  },

  async _openIDB() {
    try {
      this._idb = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME))
            d.createObjectStore(STORE_NAME, { keyPath: "year" });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
      this._idbReady = true;
      this._fallback = false;
    } catch (e) {
      console.warn("IndexedDB unavailable, using localStorage fallback.", e);
      this._fallback = true;
    }
  },

  async get(year) {
    let result = null;

    if (this.ready && supabase) {
      if (this.normalizedReady) {
        result = await this._getNormalized(year);
      }
      if (!result) {
        result = await this._getLegacy(year);
      }
    }

    if (!result && this._idbReady) {
      try {
        result = await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, "readonly");
          const r = tx.objectStore(STORE_NAME).get(year);
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = (e) => reject(e.target.error);
        });
      } catch {}
    }

    if (!result && this._fallback) {
      try {
        const raw = localStorage.getItem(lsKey(year));
        result = raw ? JSON.parse(raw) : null;
      } catch {}
    }

    return result;
  },

  async _getNormalized(year) {
    try {
      const { data: election, error: electionError } = await supabase
        .from("election_years")
        .select("*")
        .eq("year", year)
        .maybeSingle();
      if (electionError) throw electionError;
      if (!election) return null;

      const [positionsRes, candidatesRes, votersRes, ballotsRes, votesRes, reportsRes] =
        await Promise.all([
          supabase.from("positions").select("*").eq("year", year).order("display_order"),
          supabase.from("candidates").select("*").eq("year", year).order("name"),
          supabase.from("voters").select("*").eq("year", year).order("created_at", { ascending: false }),
          supabase.from("ballots").select("*").eq("year", year).order("cast_at", { ascending: false }),
          supabase.from("ballot_votes").select("*").eq("year", year).order("created_at", { ascending: true }),
          supabase.from("reports").select("*").eq("year", year).order("created_at", { ascending: false }),
        ]);

      const firstError = [positionsRes, candidatesRes, votersRes, ballotsRes, votesRes, reportsRes].find(
        (response) => response.error,
      )?.error;
      if (firstError) throw firstError;

      const ballotsByVoter = new Map((ballotsRes.data || []).map((ballot) => [ballot.voter_id, ballot]));
      const voters = (votersRes.data || []).map((row) => {
        const ballot = ballotsByVoter.get(row.id) || {};
        return {
          id: row.id,
          name: row.name,
          grade: row.grade,
          section: row.section || "",
          club: row.club || "",
          electionType: ballot.election_type || "sbo",
          deviceId: row.device_id,
          timestamp: ballot.cast_at || row.created_at,
        };
      });

      this.syncStatus = "cloud";
      this.syncError = "";
      return {
        year,
        positions: (positionsRes.data || []).map(rowToPosition),
        candidates: (candidatesRes.data || []).map(rowToCandidate),
        voters,
        votes: (votesRes.data || []).map((row) => ({
          id: row.id,
          voterId: row.voter_id,
          candidateId: row.candidate_id,
          positionId: row.position_id,
          timestamp: row.created_at,
        })),
        votedDevices: (ballotsRes.data || []).map((ballot) => `${ballot.device_id}:${ballot.election_type}`),
        reports: (reportsRes.data || []).map(rowToReport),
        settings: normalizeSettings(election),
      };
    } catch (error) {
      this.syncStatus = "error";
      this.syncError = formatSupabaseError("NORMALIZED SELECT", error, true);
      return null;
    }
  },

  async _getLegacy(year) {
    try {
      const { data, error } = await supabase
        .from("elections")
        .select("data")
        .eq("year", year)
        .maybeSingle();
      if (!error) {
        this.syncStatus = "cloud";
        this.syncError = "";
        return data ? data.data : null;
      }
      this.syncStatus = "error";
      this.syncError = formatSupabaseError("SELECT", error);
    } catch (e) {
      this.syncStatus = "error";
      this.syncError = e.message || String(e);
    }
    return null;
  },

  async save(year, data) {
    const payload = clone(data);
    let saved = false;

    if (this.ready && supabase) {
      if (this.normalizedReady) {
        saved = await this._saveNormalized(year, payload);
      }
      if (!saved) {
        saved = await this._saveLegacy(year, payload);
      }
    }

    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put({
            ...payload,
            year,
            updatedAt: new Date().toISOString(),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(e.target.error);
        });
        saved = true;
      } catch (e) {
        console.error("IndexedDB save failed:", e);
      }
    }

    if (!saved && this._fallback) {
      try {
        localStorage.setItem(lsKey(year), JSON.stringify(payload));
        saved = true;
      } catch (e) {
        console.error("localStorage save failed:", e);
      }
    }

    if (!saved) {
      console.error("All save methods failed for year:", year);
    }
  },

  async _saveNormalized(year, data) {
    try {
      const { error: yearError } = await supabase
        .from("election_years")
        .upsert(settingsToRow(year, data.settings));
      if (yearError) throw yearError;

      await this._replaceYearRows(year, data);
      this.syncStatus = "cloud";
      this.syncError = "";
      return true;
    } catch (error) {
      this.syncStatus = "error";
      this.syncError = formatSupabaseError("NORMALIZED UPSERT", error, true);
      console.warn("Normalized Supabase save failed.", error);
      return false;
    }
  },

  async _replaceYearRows(year, data) {
    await supabase.from("ballot_votes").delete().eq("year", year);
    await supabase.from("ballots").delete().eq("year", year);
    await supabase.from("voters").delete().eq("year", year);
    await supabase.from("reports").delete().eq("year", year);
    await supabase.from("candidates").delete().eq("year", year);
    await supabase.from("positions").delete().eq("year", year);

    const positions = (data.positions || []).map((position) => positionToRow(year, position));
    if (positions.length) {
      const { error } = await supabase.from("positions").insert(positions);
      if (error) throw error;
    }

    const candidates = (data.candidates || []).map((candidate) => candidateToRow(year, candidate));
    if (candidates.length) {
      const { error } = await supabase.from("candidates").insert(candidates);
      if (error) throw error;
    }

    const voters = (data.voters || []).map((voter) => voterToRow(year, voter));
    if (voters.length) {
      const { error } = await supabase.from("voters").insert(voters);
      if (error) throw error;
    }

    const ballots = (data.voters || []).map((voter) => ({
      id: makeBallotId(voter),
      year,
      voter_id: voter.id,
      election_type: voter.electionType || "sbo",
      device_id: voter.deviceId,
      cast_at: voter.timestamp || new Date().toISOString(),
    }));
    if (ballots.length) {
      const { error } = await supabase.from("ballots").insert(ballots);
      if (error) throw error;
    }

    const ballotIdByVoter = new Map((data.voters || []).map((voter) => [voter.id, makeBallotId(voter)]));
    const votes = (data.votes || []).map((vote) => ({
      id: vote.id,
      year,
      ballot_id: ballotIdByVoter.get(vote.voterId),
      voter_id: vote.voterId,
      position_id: vote.positionId,
      candidate_id: vote.candidateId,
      created_at: vote.timestamp || new Date().toISOString(),
    })).filter((vote) => vote.ballot_id);
    if (votes.length) {
      const { error } = await supabase.from("ballot_votes").insert(votes);
      if (error) throw error;
    }

    const reports = (data.reports || []).map((report) => reportToRow(year, report));
    if (reports.length) {
      const { error } = await supabase.from("reports").insert(reports);
      if (error) throw error;
    }
  },

  async _saveLegacy(year, payload) {
    try {
      const { error } = await supabase
        .from("elections")
        .upsert({
          year,
          data: payload,
          updated_at: new Date().toISOString(),
        });
      if (!error) {
        this.syncStatus = "cloud";
        this.syncError = "";
        return true;
      }
      this.syncStatus = "error";
      this.syncError = formatSupabaseError("UPSERT", error);
    } catch (e) {
      this.syncStatus = "error";
      this.syncError = e.message || String(e);
      console.warn("Supabase save failed.", e);
    }
    return false;
  },

  async castBallot(year, electionType, deviceId, voter, selectedVotes) {
    const votes = Object.entries(selectedVotes || {}).flatMap(([positionId, candidateIds]) =>
      (candidateIds || []).map((candidateId) => ({
        id: `vt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        positionId,
        candidateId,
      })),
    );

    if (this.ready && this.normalizedReady && supabase) {
      const { data, error } = await supabase.rpc("cast_ballot", {
        p_year: year,
        p_election_type: electionType,
        p_device_id: deviceId,
        p_voter: voter,
        p_votes: votes,
      });
      if (error) {
        this.syncStatus = "error";
        this.syncError = formatSupabaseError("CAST BALLOT", error, true);
        throw error;
      }
      this.syncStatus = "cloud";
      this.syncError = "";
      return data;
    }

    return null;
  },

  async testConnection() {
    if (!this.ready || !supabase)
      return { ok: false, error: "Supabase not configured" };
    try {
      if (this.normalizedReady) {
        const { error } = await supabase
          .from("election_years")
          .select("year", { count: "exact", head: true });
        if (error) return { ok: false, error: formatSupabaseError("NORMALIZED SELECT", error, true) };
        return { ok: true, normalized: true };
      }

      const { error: selErr } = await supabase
        .from("elections")
        .select("year", { count: "exact", head: true });
      if (selErr)
        return { ok: false, error: formatSupabaseError("SELECT", selErr) };
      return { ok: true, normalized: false };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  },

  async seedCandidatesToSupabase(year, candidates) {
    if (!this.ready || !supabase) {
      return { ok: false, error: "Supabase not configured" };
    }
    if (!this.normalizedReady) {
      return { ok: false, error: "Normalized tables not available" };
    }

    try {
      // Delete existing candidates for this year
      const { error: deleteError } = await supabase
        .from("candidates")
        .delete()
        .eq("year", year);
      
      if (deleteError) {
        console.warn("Delete candidates error:", deleteError);
        // Continue anyway - table might be empty
      }

      // Insert new candidates
      const candidateRows = candidates.map(c => candidateToRow(year, c));
      
      if (candidateRows.length > 0) {
        const { error: insertError } = await supabase
          .from("candidates")
          .insert(candidateRows);
        
        if (insertError) throw insertError;
      }

      return { ok: true, count: candidateRows.length };
    } catch (error) {
      console.error("Seed candidates to Supabase failed:", error);
      return { ok: false, error: formatSupabaseError("SEED CANDIDATES", error, true) };
    }
  },

  async list() {
    let years = [];

    if (this.ready && supabase) {
      try {
        if (this.normalizedReady) {
          const { data, error } = await supabase
            .from("election_years")
            .select("year")
            .order("year", { ascending: true });
          if (error) throw error;
          years = (data || []).map((d) => d.year);
        } else {
          const { data, error } = await supabase
            .from("elections")
            .select("year")
            .order("year", { ascending: true });
          if (!error) years = (data || []).map((d) => d.year);
          else {
            this.syncStatus = "error";
            this.syncError = formatSupabaseError("SELECT", error);
          }
        }
      } catch (e) {
        this.syncStatus = "error";
        this.syncError = formatSupabaseError("LIST", e, true);
      }
    }

    if (!years.length && this._idbReady) {
      try {
        years = await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, "readonly");
          const r = tx.objectStore(STORE_NAME).getAllKeys();
          r.onsuccess = () => resolve(r.result.map(String));
          r.onerror = (e) => reject(e.target.error);
        });
      } catch {}
    }

    if (!years.length && this._fallback) {
      try {
        years = Object.keys(localStorage)
          .filter((k) => k.startsWith(LS_PREFIX))
          .map((k) => k.slice(LS_PREFIX.length));
      } catch {}
    }

    return years.sort();
  },

  async remove(year) {
    if (this.ready && supabase) {
      try {
        if (this.normalizedReady) {
          await supabase.from("election_years").delete().eq("year", year);
        } else {
          await supabase.from("elections").delete().eq("year", year);
        }
      } catch (e) {
        console.warn("Supabase remove failed.", e);
      }
    }

    if (this._idbReady) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this._idb.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(year);
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(e.target.error);
        });
      } catch {}
    }

    if (this._fallback) {
      try {
        localStorage.removeItem(lsKey(year));
      } catch {}
    }
  },

  async uploadCandidatePhoto(year, candidateId, file) {
    if (!this.ready || !supabase || !file || typeof file === "string") {
      return { ok: false, fallback: true };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return { ok: false, fallback: true };
    }

    const contentType = file.type || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: "Please upload an image file." };
    }

    const path = candidatePhotoPath(year, candidateId, contentType);
    const { error } = await supabase.storage
      .from(CANDIDATE_PHOTO_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });

    if (error) {
      return {
        ok: false,
        error: formatSupabaseError("STORAGE UPLOAD", error, true),
      };
    }

    const { data } = supabase.storage
      .from(CANDIDATE_PHOTO_BUCKET)
      .getPublicUrl(path);

    return {
      ok: true,
      path,
      url: `${data.publicUrl}?v=${Date.now()}`,
    };
  },

  async signInAdmin(email, password) {
    if (!this.ready || !supabase) return { ok: false, fallback: true };
    if (!email || !password) return { ok: false, fallback: true };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    const userId = data?.user?.id;
    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { ok: false, error: "Signed in user is not an election admin." };
    }
    return { ok: true, user: data.user };
  },

  async signOutAdmin() {
    if (this.ready && supabase) {
      await supabase.auth.signOut();
    }
  },
};
