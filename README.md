🎓 UOK Smart Assist

AI-Powered University Chatbot (Final Year Project)

📌 Project Overview

UOK Smart Assist is an AI-powered chatbot designed to provide instant, accurate, and context-aware responses to university-related queries.
The system uses Retrieval-Augmented Generation (RAG) with a vector database to answer questions based on uploaded PDFs and scraped university data.

This project aims to replace traditional manual inquiry systems with an intelligent, automated solution.

🏫 University Information

University Name: University of Karachi

Department: Computer Science / Software Engineering (adjust if needed)

Project Type: Final Year Project (FYP)

👨‍💻 Project Members

Muhtashum Ahmed

Moiz

Ahad

Azeem

🎯 Objectives of the Project

Build an AI-based chatbot for university-related queries

Allow document-based knowledge ingestion (PDFs & web data)

Implement semantic search using vector embeddings

Provide accurate, grounded responses using RAG architecture

Reduce manual workload on inquiry/help desks

⚙️ Technologies Used
Frontend

React.js

Vite

TypeScript

Tailwind CSS

shadcn-ui

Backend & AI

Supabase (PostgreSQL + Vector Extension)

RAG (Retrieval-Augmented Generation)

LLM (for response generation)

PDF Parsing & Text Chunking

Embeddings for Semantic Search

🧠 System Architecture

The chatbot follows a Retrieval-Augmented Generation (RAG) workflow:

University documents (PDFs / scraped content) are uploaded

Text is chunked and converted into vector embeddings

Embeddings are stored in Supabase PostgreSQL vector database

User query is converted into an embedding

Similarity search retrieves relevant content

Retrieved context is passed to the LLM

Chatbot generates a grounded and accurate response

📊 Key Features

AI-powered semantic search

PDF-based knowledge ingestion

Context-aware chatbot responses

Login & anonymous user access

Secure data handling using Supabase RLS

Scalable and modular architecture

🔐 Environment Setup

Create a .env file in the project root:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


⚠️ Note:
Never expose Supabase service role key on the frontend.

▶️ How to Run the Project Locally
Step 1: Clone Repository
git clone <YOUR_GIT_REPO_URL>

Step 2: Go to Project Directory
cd uok-smart-assist

Step 3: Install Dependencies
npm install

Step 4: Start Development Server
npm run dev

🧪 Use Cases

Students asking about admissions, fees, deadlines

Faculty queries related to policies and notices

General users accessing university information

Admins managing knowledge sources

📈 Future Enhancements

Voice-based interaction

Multilingual support (Urdu + English)

Role-based admin dashboard

Fine-tuned university-specific LLM

Analytics for common user queries

📚 Conclusion

UOK Smart Assist demonstrates how AI, vector databases, and RAG architecture can be effectively used to modernize university information systems.
The system improves accessibility, reduces response time, and ensures accurate information delivery.

📝 License

This project is developed for academic purposes as a Final Year Project.