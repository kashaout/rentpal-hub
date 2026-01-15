import { useState } from "react";
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
  Plus,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "doc" | "xlsx" | "image" | "other";
  category: string;
  size: string;
  uploadedAt: string;
  property?: string;
}

// Mock data - in production this would come from Supabase storage
const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Lease Agreement - Unit 4B.pdf",
    type: "pdf",
    category: "Leases",
    size: "2.4 MB",
    uploadedAt: "2025-01-10",
    property: "Sunset Apartments",
  },
  {
    id: "2",
    name: "Property Inspection Report.pdf",
    type: "pdf",
    category: "Reports",
    size: "1.8 MB",
    uploadedAt: "2025-01-08",
    property: "Oak Street Complex",
  },
  {
    id: "3",
    name: "Rent Roll - January 2025.xlsx",
    type: "xlsx",
    category: "Financial",
    size: "456 KB",
    uploadedAt: "2025-01-05",
  },
  {
    id: "4",
    name: "Insurance Certificate.pdf",
    type: "pdf",
    category: "Insurance",
    size: "890 KB",
    uploadedAt: "2025-01-03",
  },
];

const categories = ["All", "Leases", "Reports", "Financial", "Insurance", "Maintenance"];

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: File,
  xlsx: FileSpreadsheet,
  image: FileImage,
  other: File,
};

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [documents] = useState<Document[]>(mockDocuments);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "text-red-500";
      case "xlsx":
        return "text-green-600";
      case "doc":
        return "text-blue-500";
      case "image":
        return "text-purple-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 p-6">
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
        <Button className="gap-2 bg-gradient-warm text-accent-foreground hover:opacity-90">
          <Upload className="h-4 w-4" />
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
              const Icon = typeIcons[doc.type] || File;
              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <Icon className={cn("h-5 w-5 shrink-0", getTypeColor(doc.type))} />
                    <span className="truncate font-medium text-foreground">{doc.name}</span>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="font-normal">
                      {doc.category}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground truncate">
                    {doc.property || "—"}
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">{doc.size}</div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
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
            <Button className="mt-4 gap-2" variant="outline">
              <Plus className="h-4 w-4" />
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
            {documents.filter((d) => d.type === "pdf").length}
          </p>
          <p className="text-sm text-muted-foreground">PDF Files</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <FileSpreadsheet className="mx-auto h-6 w-6 text-green-600" />
          <p className="mt-2 text-2xl font-semibold">
            {documents.filter((d) => d.type === "xlsx").length}
          </p>
          <p className="text-sm text-muted-foreground">Spreadsheets</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <File className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-semibold">
            {documents.filter((d) => d.category === "Leases").length}
          </p>
          <p className="text-sm text-muted-foreground">Lease Docs</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <FolderOpen className="mx-auto h-6 w-6 text-amber-500" />
          <p className="mt-2 text-2xl font-semibold">{documents.length}</p>
          <p className="text-sm text-muted-foreground">Total Files</p>
        </div>
      </div>
    </div>
  );
}
