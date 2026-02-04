"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Customer = {
  id: number;
  name: string;
};

type CustomerFilterProps = {
  customers: Customer[];
  currentCustomerId?: string;
};

export function CustomerFilter({ customers, currentCustomerId }: CustomerFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCustomerChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "all") {
      params.delete("customerId");
    } else {
      params.set("customerId", value);
    }
    
    // Preserve other search params like highlight
    router.push(`/todos?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="customer-filter" className="text-sm font-medium whitespace-nowrap">
        Filter by Customer:
      </Label>
      <Select
        value={currentCustomerId || "all"}
        onValueChange={handleCustomerChange}
      >
        <SelectTrigger id="customer-filter" className="w-[250px]">
          <SelectValue placeholder="All Customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Customers</SelectItem>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id.toString()}>
              {customer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
