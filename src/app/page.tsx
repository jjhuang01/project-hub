import { getProjects } from "@/lib/projects";
import { ProjectGrid } from "@/components/ProjectGrid";

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const allProjects = await getProjects();
  
  const { category } = await searchParams;
  
  const projects = category 
    ? allProjects.filter(p => p.category === category)
    : allProjects;

  return (
    <ProjectGrid projects={projects} />
  );
}
