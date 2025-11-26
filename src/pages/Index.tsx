import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const Index = () => {
  const projects = [
    { id: 1, name: "Website Redesign", status: "In Progress", tasks: 12, completed: 8 },
    { id: 2, name: "Mobile App Development", status: "Planning", tasks: 24, completed: 3 },
    { id: 3, name: "Marketing Campaign", status: "In Progress", tasks: 8, completed: 6 },
    { id: 4, name: "Database Migration", status: "Completed", tasks: 15, completed: 15 },
  ];

  const stats = [
    { label: "Active Projects", value: "12", icon: FolderKanban, color: "text-primary" },
    { label: "Tasks Pending", value: "34", icon: Clock, color: "text-accent" },
    { label: "Completed", value: "89", icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Progress", value: "72%", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workspace</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your overview</p>
            </div>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="p-6 hover:shadow-medium transition-shadow duration-300 border-border/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-secondary rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id}
                className="p-6 hover:shadow-medium transition-all duration-300 hover:border-primary/50 cursor-pointer border-border/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{project.name}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === "Completed" 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : project.status === "In Progress"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {project.completed}/{project.tasks} tasks
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-500"
                      style={{ width: `${(project.completed / project.tasks) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
