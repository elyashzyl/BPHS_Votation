import { describe, expect, it } from "vitest";
import {
  archiveOrDeleteCandidate,
  archiveOrDeletePosition,
  scopedCandidates,
  tallyResults,
  validateBallotSelections,
} from "./electionIntegrity.js";

function fixture() {
  return {
    positions: [
      { id: "pos_pres", name: "President", type: "sbo", order: 1, maxVote: 1 },
      { id: "pos_rep", name: "Grade Rep", type: "sbo", order: 2, maxVote: 2, filterByGrade: true },
      { id: "pos_class", name: "Class President", type: "classroom", order: 1, maxVote: 1 },
    ],
    candidates: [
      { id: "cand_a", positionId: "pos_pres", name: "Ana", grade: "7" },
      { id: "cand_b", positionId: "pos_pres", name: "Ben", grade: "8" },
      { id: "cand_c", positionId: "pos_rep", name: "Cara", grade: "7" },
      { id: "cand_d", positionId: "pos_rep", name: "Dan", grade: "8" },
      { id: "cand_e", positionId: "pos_class", name: "Eli", grade: "7", section: "Pine" },
    ],
    voters: [{ id: "v_1", name: "Student", grade: "7", section: "Pine", electionType: "sbo" }],
    votes: [
      { id: "vt_1", voterId: "v_1", positionId: "pos_pres", candidateId: "cand_a" },
      { id: "vt_2", voterId: "v_1", positionId: "pos_rep", candidateId: "cand_c" },
    ],
  };
}

describe("election integrity helpers", () => {
  it("archives a position with votes and preserves historical votes", () => {
    const data = fixture();
    const result = archiveOrDeletePosition(data, "pos_pres");

    expect(result.action).toBe("archived");
    expect(data.positions.find((position) => position.id === "pos_pres").archived).toBe(true);
    expect(data.votes).toHaveLength(2);
  });

  it("deletes a candidate without votes", () => {
    const data = fixture();
    const result = archiveOrDeleteCandidate(data, "cand_b");

    expect(result.action).toBe("deleted");
    expect(data.candidates.some((candidate) => candidate.id === "cand_b")).toBe(false);
  });

  it("filters grade-scoped and classroom candidates for the voter", () => {
    const data = fixture();

    expect(scopedCandidates(data, data.positions[1], { grade: "7" }).map((candidate) => candidate.id)).toEqual(["cand_c"]);
    expect(scopedCandidates(data, data.positions[2], { section: "Pine" }).map((candidate) => candidate.id)).toEqual(["cand_e"]);
  });

  it("rejects over-voting and invalid scoped candidates", () => {
    const data = fixture();

    expect(validateBallotSelections(data, "sbo", { grade: "7" }, { pos_pres: ["cand_a", "cand_b"] }).ok).toBe(false);
    expect(validateBallotSelections(data, "sbo", { grade: "7" }, { pos_rep: ["cand_d"] }).ok).toBe(false);
  });

  it("tallies winners and totals", () => {
    const results = tallyResults(fixture());

    expect(results.pos_pres.totalVotes).toBe(1);
    expect(results.pos_pres.winners[0].id).toBe("cand_a");
    expect(results.pos_rep.candidates[0].votes).toBe(1);
  });
});
