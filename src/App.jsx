import { createSignal, onMount, createEffect, For, Show } from 'solid-js';
import { createEvent, supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-solid';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function App() {
  const [user, setUser] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal('login');
  const [projectIdea, setProjectIdea] = createSignal('');
  const [aiResponse, setAiResponse] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [projects, setProjects] = createSignal([]);

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setCurrentPage('homePage');
    }
  };

  onMount(checkUserSignedIn);

  createEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
        setCurrentPage('homePage');
      } else {
        setUser(null);
        setCurrentPage('login');
      }
    });

    return () => {
      authListener.unsubscribe();
    };
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('login');
  };

  const analyzeProject = async () => {
    if (!projectIdea()) return;
    setLoading(true);
    try {
      const prompt = `Analyze the following project: "${projectIdea()}".

1) Identify the key risks that could be encountered.
2) Evaluate their likelihood and potential impact using a scoring system from 1 (lowest) to 5 (highest).
3) Offer actionable mitigation strategies to safeguard the project.

Provide the response in the following JSON format:

{
  "risks": [
    {
      "risk": "Description of the risk",
      "likelihood": number from 1 to 5,
      "impact": number from 1 to 5,
      "mitigation": "Mitigation strategy"
    },
    // ... more risks
  ]
}`;

      const result = await createEvent('chatgpt_request', {
        prompt: prompt,
        response_type: 'json'
      });

      setAiResponse(result);
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/saveProject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectIdea: projectIdea(),
          aiResponse: JSON.stringify(aiResponse())
        }),
      });
      if (response.ok) {
        fetchProjects();
        setProjectIdea('');
        setAiResponse(null);
      } else {
        console.error('Error saving project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const fetchProjects = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch('/api/getProjects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Error fetching projects:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  createEffect(() => {
    if (user()) {
      fetchProjects();
    }
  });

  const viewProject = (project) => {
    setProjectIdea(project.projectIdea);
    setAiResponse(JSON.parse(project.aiResponse));
  };

  return (
    <div class="min-h-screen h-full bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-gray-800">
      <Show
        when={currentPage() === 'homePage'}
        fallback={
          <div class="flex items-center justify-center min-h-screen">
            <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
              <h2 class="text-3xl font-bold mb-6 text-center text-purple-600">Sign in with ZAPT</h2>
              <a
                href="https://www.zapt.ai"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 hover:underline mb-6 block text-center"
              >
                Learn more about ZAPT
              </a>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={['google', 'facebook', 'apple']}
                magicLink={true}
              />
            </div>
          </div>
        }
      >
        <div class="max-w-7xl mx-auto">
          <div class="flex justify-between items-center mb-8">
            <h1 class="text-4xl font-bold text-purple-600">Risk Assessment Platform</h1>
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="col-span-2">
              <h2 class="text-2xl font-bold mb-4 text-purple-600">Enter Your Project Idea</h2>
              <textarea
                rows="5"
                placeholder="Describe your project, specific activity, or business idea..."
                value={projectIdea()}
                onInput={(e) => setProjectIdea(e.target.value)}
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent box-border"
              ></textarea>
              <button
                onClick={analyzeProject}
                class={`mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading()}
              >
                <Show when={loading()}>
                  Analyzing...
                </Show>
                <Show when={!loading()}>
                  Analyze Project
                </Show>
              </button>
              <Show when={aiResponse()}>
                <div class="mt-8">
                  <h2 class="text-2xl font-bold mb-4 text-purple-600">Risk Assessment Results</h2>
                  <For each={aiResponse().risks}>
                    {(riskItem) => (
                      <div class="bg-white p-6 rounded-lg shadow-md mb-4">
                        <p class="font-semibold text-lg text-purple-600 mb-2">{riskItem.risk}</p>
                        <p><strong>Likelihood:</strong> {riskItem.likelihood}</p>
                        <p><strong>Impact:</strong> {riskItem.impact}</p>
                        <p><strong>Mitigation:</strong> {riskItem.mitigation}</p>
                      </div>
                    )}
                  </For>
                  <button
                    onClick={saveProject}
                    class="mt-4 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
                  >
                    Save Project
                  </button>
                </div>
              </Show>
            </div>
            <div class="col-span-1">
              <h2 class="text-2xl font-bold mb-4 text-purple-600">Saved Projects</h2>
              <div class="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
                <For each={projects()}>
                  {(project) => (
                    <div
                      class="bg-white p-4 rounded-lg shadow-md cursor-pointer transition duration-300 ease-in-out transform hover:scale-105"
                      onClick={() => viewProject(project)}
                    >
                      <p class="font-semibold text-purple-600">{project.projectIdea.substring(0, 50)}...</p>
                      <p class="text-sm text-gray-500">{new Date(project.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default App;