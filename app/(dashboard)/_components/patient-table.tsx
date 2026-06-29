"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { activePatientIdAtom } from "@/lib/state/_atoms";
import type { Patient } from "@/lib/domain/_schema";
import { deletePatient } from "@/lib/actions/patient-files";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [1, 5, 10, 15, 20, 25, 50, 100];

interface PatientTableProps {
  patients: Patient[];
}

export function PatientTable({ patients }: PatientTableProps) {
  const router = useRouter();
  const setActivePatient = useSetAtom(activePatientIdAtom);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(patients.length / pageSize));

  // Clamp page when patients change or pageSize changes
  const safePage = Math.min(page, totalPages);

  const pagedPatients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return patients.slice(start, start + pageSize);
  }, [patients, safePage, pageSize]);

  const handleRowClick = (patientId: string) => {
    setActivePatient(patientId);
    router.push(`/patients/${patientId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deletePatient(deleteTarget.id);
    toast("Deleted", { description: `Patient "${deleteTarget.name}" moved to archive.` });
    setDeleteTarget(null);
    router.refresh();
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) return;
    const size = Number(value);
    setPageSize(size);
    setPage(1);
  };

  return (
    <>
      <div className="ui-content-card rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Clinical Context</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedPatients.map((patient) => (
              <TableRow
                key={patient.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(patient.id)}
              >
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {patient.ageRange ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {patient.clinicalBackground?.slice(0, 80) ?? "—"}
                  {(patient.clinicalBackground?.length ?? 0) > 80 ? "…" : ""}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      patient.consentStatus === "granted" ? "default" : "secondary"
                    }
                  >
                    {patient.consentStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(patient);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, patients.length)} of{" "}
              {patients.length}
            </span>
            <div className="flex items-center ml-2">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              This will move all data for {deleteTarget?.name} ({deleteTarget?.id}) to the deleted patients archive. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="size-3.5 mr-1.5" />Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}