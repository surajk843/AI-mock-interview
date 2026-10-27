import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import React from "react";

interface CustomBreadCrumbProps {
  breadCrumbPage: string;
  breadCrumbItems?: { link: string; label: string }[];
}

export const CustomBreadCrumb = ({
  breadCrumbPage,
  breadCrumbItems,
}: CustomBreadCrumbProps) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="/"
            className="flex items-center justify-center hover:text-emerald-500"
          >
            <Home className="mr-2 h-3 w-3" />
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadCrumbItems?.map((item, index) => (
          <React.Fragment key={`${item.link}-${index}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={item.link}
                className="hover:text-emerald-500"
              >
                {item.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </React.Fragment>
        ))}

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage>{breadCrumbPage}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};