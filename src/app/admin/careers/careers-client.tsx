"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createJob, updateJob, deleteJob } from "@/lib/actions/admin";
import type { JobListing } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CareersClient({ jobs }: { jobs: JobListing[] }) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newType, setNewType] = useState("full-time");
  const [newRequirements, setNewRequirements] = useState("");
  const [newSalaryRange, setNewSalaryRange] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editSalaryRange, setEditSalaryRange] = useState("");

  function handleCreate() {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createJob({
        title: newTitle.trim(),
        description: newDescription.trim(),
        department: newDepartment.trim() || undefined,
        location: newLocation.trim() || undefined,
        type: newType,
        requirements: newRequirements.trim() || undefined,
        salary_range: newSalaryRange.trim() || undefined,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewTitle("");
        setNewDescription("");
        setNewDepartment("");
        setNewLocation("");
        setNewType("full-time");
        setNewRequirements("");
        setNewSalaryRange("");
      }
    });
  }

  function startEdit(job: JobListing) {
    setEditingId(job.id);
    setEditTitle(job.title);
    setEditDescription(job.description);
    setEditDepartment(job.department ?? "");
    setEditLocation(job.location ?? "");
    setEditType(job.type);
    setEditRequirements(job.requirements ?? "");
    setEditSalaryRange(job.salary_range ?? "");
  }

  function handleUpdate(id: string) {
    if (!editTitle.trim() || !editDescription.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateJob(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        department: editDepartment.trim() || undefined,
        location: editLocation.trim() || undefined,
        type: editType,
        requirements: editRequirements.trim() || undefined,
        salary_range: editSalaryRange.trim() || undefined,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this job listing?"))
      return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteJob(id);
      if (result.error) setActionError(result.error);
    });
  }

  function handleToggleActive(job: JobListing) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateJob(job.id, { is_active: !job.is_active });
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">Careers</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? "Cancel" : "New Job"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {jobs.length} total listing{jobs.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{jobs.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Jobs</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{jobs.filter(j => j.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Active</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">{jobs.filter(j => !j.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Inactive</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(jobs.map(j => j.department).filter(Boolean)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Departments</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(jobs.map(j => j.location).filter(Boolean)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Locations</div>
        </div>
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 border border-rule bg-surface-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
            New Job Listing
          </p>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            rows={4}
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Department"
              className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
            />
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Location"
              className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <textarea
            value={newRequirements}
            onChange={(e) => setNewRequirements(e.target.value)}
            placeholder="Requirements"
            rows={3}
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <input
            type="text"
            value={newSalaryRange}
            onChange={(e) => setNewSalaryRange(e.target.value)}
            placeholder="Salary Range (e.g. $80k - $120k)"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <button
            onClick={handleCreate}
            disabled={
              isPending || !newTitle.trim() || !newDescription.trim()
            }
            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              "Create"
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule bg-surface-raised">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Title
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Department
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Location
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Type
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Active
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Created
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  No job listings found.
                </td>
              </tr>
            ) : (
              jobs.map((job) =>
                editingId === job.id ? (
                  <tr
                    key={job.id}
                    className="border-b border-rule bg-surface-card"
                  >
                    <td colSpan={7} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                          Edit Job Listing
                        </p>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          rows={4}
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            placeholder="Department"
                            className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                          />
                          <input
                            type="text"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            placeholder="Location"
                            className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                          />
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                          >
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                          </select>
                        </div>
                        <textarea
                          value={editRequirements}
                          onChange={(e) => setEditRequirements(e.target.value)}
                          placeholder="Requirements"
                          rows={3}
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <input
                          type="text"
                          value={editSalaryRange}
                          onChange={(e) => setEditSalaryRange(e.target.value)}
                          placeholder="Salary Range"
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdate(job.id)}
                            disabled={isPending}
                            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
                          >
                            {isPending ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={job.id}
                    className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap max-w-[180px] truncate">
                      {job.title}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                      {job.department ?? "--"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                      {job.location ?? "--"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(job)}
                        disabled={isPending}
                        className={`text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 ${
                          job.is_active
                            ? "text-editorial-green"
                            : "text-ink-muted"
                        }`}
                      >
                        {job.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(job)}
                          className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          disabled={isPending}
                          className="text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {jobs.length} listing{jobs.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
