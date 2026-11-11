import type { Application, ApplicationInput } from "../types";
import { dateOffset, dateTimeOffset } from "../lib/dates";
import { ApiError, type ApplicationsApi } from "./types";

// Browser-only stand-in for the Go backend, so the UI can be built and tried
// before the server exists. Data lives in localStorage under this key.
const STORAGE_KEY = "job-tracker:mock-applications";

function seed(): Application[] {
  const id = () => crypto.randomUUID();
  return [
    {
      id: id(),
      company: "Lumen Space Systems",
      jobTitle: "Embedded Software Engineer",
      applicationDate: dateOffset(-12),
      status: "interview",
      jobUrl: "https://example.com/careers/lumen-embedded-software",
      interviewDate: dateTimeOffset(3, "10:30"),
      notes:
        "Panel of three: flight software lead, hardware lead and HR. Prepare a short walkthrough of the RTOS project.",
    },
    {
      id: id(),
      company: "Northwind Robotics",
      jobTitle: "Machine Learning Engineer",
      applicationDate: dateOffset(-20),
      status: "interview",
      jobUrl: "https://example.com/careers/northwind-ml",
      interviewDate: dateTimeOffset(9, "14:00"),
      notes: "Technical round: Python coding plus one systems design question.",
    },
    {
      id: id(),
      company: "Quartz Mobility",
      jobTitle: "Computer Vision Engineer",
      applicationDate: dateOffset(-40),
      status: "offer",
      jobUrl: "https://example.com/careers/quartz-cv",
      interviewDate: dateTimeOffset(-14, "11:00"),
      notes:
        "Offer received. Decision due in two weeks. Ask about relocation support and the team's publication policy.",
    },
    {
      id: id(),
      company: "Brightloom",
      jobTitle: "Full-stack Developer",
      applicationDate: dateOffset(-9),
      status: "applied",
      jobUrl: "https://example.com/careers/brightloom-fullstack",
      interviewDate: "",
      notes: "Applied through the careers page with a tailored cover letter.",
    },
    {
      id: id(),
      company: "Kestrel Analytics",
      jobTitle: "Data Engineer",
      applicationDate: dateOffset(-6),
      status: "applied",
      jobUrl: "",
      interviewDate: "",
      notes: "Referred by a former colleague. Follow up if there is no reply within a week.",
    },
    {
      id: id(),
      company: "Aldersgate Labs",
      jobTitle: "Backend Engineer (Go)",
      applicationDate: dateOffset(-3),
      status: "applied",
      jobUrl: "https://example.com/careers/aldersgate-backend-go",
      interviewDate: "",
      notes: "",
    },
    {
      id: id(),
      company: "Orbit Works",
      jobTitle: "Software Engineer",
      applicationDate: "",
      status: "wishlist",
      jobUrl: "https://example.com/careers/orbit-works",
      interviewDate: "",
      notes: "Applications open in January. Draft the cover letter before then.",
    },
    {
      id: id(),
      company: "Tessellate",
      jobTitle: "Research Software Engineer",
      applicationDate: dateOffset(-30),
      status: "rejected",
      jobUrl: "",
      interviewDate: "",
      notes: "Rejected after the first screening call.",
    },
    {
      id: id(),
      company: "Fernhill Systems",
      jobTitle: "Platform Engineer",
      applicationDate: dateOffset(-25),
      status: "withdrawn",
      jobUrl: "",
      interviewDate: "",
      notes: "Withdrew: the role moved to another city.",
    },
  ];
}

function read(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Application[];
  } catch {
    // Storage blocked or corrupted: fall through to a fresh seed.
  }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(apps: Application[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // Storage unavailable: changes last until the page is reloaded.
  }
}

// Keeps working data in memory too, so the mock still behaves if storage is blocked.
let cache: Application[] | null = null;
const load = () => (cache ??= read());
const save = (apps: Application[]) => {
  cache = apps;
  write(apps);
};

export const mockApi: ApplicationsApi = {
  async list() {
    return structuredClone(load());
  },

  async create(input: ApplicationInput) {
    const created: Application = { id: crypto.randomUUID(), ...input };
    save([created, ...load()]);
    return structuredClone(created);
  },

  async update(id: string, input: ApplicationInput) {
    const apps = load();
    if (!apps.some((a) => a.id === id)) {
      throw new ApiError("That application no longer exists.", 404);
    }
    const updated: Application = { id, ...input };
    save(apps.map((a) => (a.id === id ? updated : a)));
    return structuredClone(updated);
  },

  async remove(id: string) {
    save(load().filter((a) => a.id !== id));
  },
};
