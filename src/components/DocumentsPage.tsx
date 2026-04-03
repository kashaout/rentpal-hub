import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  FolderOpen,
  File,
  FileSpreadsheet,
  FileImage,
  Download,
  Trash2,
  MoreHorizontal,
  Loader2,
  Pen,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDocuments, Document } from "@/hooks/useDocuments";
import { useProperties } from "@/hooks/useProperties";
import { useMyLeaseAgreements, useSignLeaseAgreement, LeaseAgreement } from "@/hooks/useLeaseAgreements";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";

const categories = ["All", "Lease Agreement", "Reports", "Financial", "Insurance", "Maintenance", "Other"];

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: File,
  docx: File,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [uploadPropertyId, setUploadPropertyId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewAgreement, setReviewAgreement] = useState<LeaseAgreement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, isLandlord, isAdmin, isConsultant, isTenant } = useAuth();
  const canManage = isLandlord || isAdmin || isConsultant;
  const { documents, isLoading, uploading, uploadDocument, deleteDocument, downloadDocument } =
    useDocuments();
  const { data: properties = [] } = useProperties();
  const { data: leaseAgreements = [] } = useMyLeaseAgreements();
  const signAgreement = useSignLeaseAgreement();

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return "text-red-500";
      case "xlsx":
      case "xls":
        return "text-green-600";
      case "doc":
      case "docx":
        return "text-blue-500";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return "text-purple-500";
      default:
        return "text-muted-foreground";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadDocument.mutateAsync({
      file: selectedFile,
      category: uploadCategory,
      propertyId: uploadPropertyId || undefined,
    });

    setUploadDialogOpen(false);
    setSelectedFile(null);
    setUploadCategory("Other");
    setUploadPropertyId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: Document) => {
    if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      await deleteDocument.mutateAsync(doc);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.txt"
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Document
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocs.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Property</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {filteredDocs.map((doc) => {
              const Icon = typeIcons[doc.file_type.toLowerCase()] || File;
              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <Icon className={cn("h-5 w-5 shrink-0", getTypeColor(doc.file_type))} />
                    <div className="min-w-0">
                      <span className="truncate font-medium text-foreground block">{doc.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="font-normal">
                      {doc.category}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground truncate">
                    {doc.properties?.name || "—"}
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/50 p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {searchQuery || selectedCategory !== "All" ? "No documents found" : "No documents yet"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || selectedCategory !== "All"
              ? "Try adjusting your search or filters."
              : "Upload your first document to get started."}
          </p>
          {!searchQuery && selectedCategory === "All" && (
            <Button
              className="mt-4 gap-2"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <FileText className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-2xl font-semibold">
            {documents.filter((d) => d.file_type.toLowerCase() === "pdf").length}
          </p>
          <p className="text-sm text-muted-foreground">PDF Files</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <FileSpreadsheet className="mx-auto h-6 w-6 text-green-600" />
          <p className="mt-2 text-2xl font-semibold">
            {documents.filter((d) => ["xlsx", "xls"].includes(d.file_type.toLowerCase())).length}
          </p>
          <p className="text-sm text-muted-foreground">Spreadsheets</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <File className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-semibold">
            {documents.filter((d) => d.category === "Lease Agreement").length}
          </p>
          <p className="text-sm text-muted-foreground">Lease Docs</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <FolderOpen className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-2xl font-semibold">{documents.length}</p>
          <p className="text-sm text-muted-foreground">Total Files</p>
        </div>
      </div>

      {/* Unsigned Lease Agreements Section - only show agreements needing action */}
      {leaseAgreements.filter(a => !(a.tenant_signed && a.landlord_signed)).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Pending Lease Agreements</h3>
          <p className="text-sm text-muted-foreground">
            {isLandlord
              ? "Review and counter-sign tenant agreements below. Fully signed agreements appear in the documents list above under 'Lease Agreement'."
              : "Your pending lease agreements are listed below. Fully signed agreements appear in the documents list above."}
          </p>
          <div className="rounded-lg border bg-card divide-y">
            {leaseAgreements.filter(a => !(a.tenant_signed && a.landlord_signed)).map((agreement) => {
              const needsCounterSign = agreement.landlord_user_id === user?.id && agreement.tenant_signed && !agreement.landlord_signed;
              return (
                <div
                  key={agreement.id}
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/30",
                    needsCounterSign && "bg-warning/5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          Lease — Unit {agreement.unit_number}
                        </span>
                        {needsCounterSign && (
                          <Badge className="bg-warning text-warning-foreground text-xs">
                            Needs Signature
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{agreement.tenant_name}</span>
                        <span>•</span>
                        <span>{format(new Date(agreement.lease_start), "MMM d, yyyy")} – {format(new Date(agreement.lease_end), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{formatCurrency(agreement.rent_amount, agreement.currency)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      {agreement.tenant_signed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {agreement.landlord_signed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setReviewAgreement(agreement)}
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {selectedFile && `Uploading: ${selectedFile.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c !== "All").map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property">Property (Optional)</Label>
              <Select value={uploadPropertyId} onValueChange={setUploadPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lease Agreement Review & Sign Dialog */}
      <Dialog open={!!reviewAgreement} onOpenChange={(open) => !open && setReviewAgreement(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {reviewAgreement && (() => {
            const isLandlordParty = reviewAgreement.landlord_user_id === user?.id;
            const isTenantParty = reviewAgreement.tenant_user_id === user?.id;
            const needsCounterSign = isLandlordParty && reviewAgreement.tenant_signed && !reviewAgreement.landlord_signed;
            const canSign =
              (isTenantParty && !reviewAgreement.tenant_signed) ||
              (isLandlordParty && !reviewAgreement.landlord_signed);
            const signRole = isLandlordParty ? "landlord" as const : "tenant" as const;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Lease Agreement — Unit {reviewAgreement.unit_number}
                  </DialogTitle>
                  <DialogDescription>
                    Review the full agreement details below.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {needsCounterSign && (
                    <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <p className="text-sm text-warning">
                        The tenant ({reviewAgreement.tenant_name}) has signed this agreement. Please review the terms and counter-sign to activate the lease.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tenant</p>
                      <p className="font-medium text-foreground">{reviewAgreement.tenant_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Landlord</p>
                      <p className="font-medium text-foreground">{reviewAgreement.landlord_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lease Period</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(reviewAgreement.lease_start), "MMM d, yyyy")} – {format(new Date(reviewAgreement.lease_end), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rent Amount</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(reviewAgreement.rent_amount, reviewAgreement.currency)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="font-medium text-foreground mb-2">Terms & Conditions</p>
                    <div className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground whitespace-pre-line max-h-60 overflow-y-auto">
                      {reviewAgreement.terms}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      {reviewAgreement.tenant_signed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={reviewAgreement.tenant_signed ? "text-success" : "text-muted-foreground"}>
                        Tenant {reviewAgreement.tenant_signed
                          ? `Signed ${reviewAgreement.tenant_signed_at ? format(new Date(reviewAgreement.tenant_signed_at), "MMM d, yyyy") : ""}`
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {reviewAgreement.landlord_signed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={reviewAgreement.landlord_signed ? "text-success" : "text-muted-foreground"}>
                        Landlord {reviewAgreement.landlord_signed
                          ? `Signed ${reviewAgreement.landlord_signed_at ? format(new Date(reviewAgreement.landlord_signed_at), "MMM d, yyyy") : ""}`
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setReviewAgreement(null)}>
                    Close
                  </Button>
                  {canSign && (
                    <Button
                      className={cn(
                        "gap-2",
                        needsCounterSign
                          ? "bg-warning text-warning-foreground hover:bg-warning/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      disabled={signAgreement.isPending}
                      onClick={async () => {
                        await signAgreement.mutateAsync({ agreementId: reviewAgreement.id, role: signRole });
                        setReviewAgreement(null);
                      }}
                    >
                      {signAgreement.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pen className="h-4 w-4" />
                      )}
                      {needsCounterSign ? "Counter-Sign Agreement" : "Sign Agreement"}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
