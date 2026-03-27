import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json(
        { error: "Clé API Gemini non configurée." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientName = formData.get("clientName") as string;
    const city = formData.get("city") as string;
    const projectName = formData.get("projectName") as string;
    const tva = formData.get("tva") as string;
    const scaleValue = formData.get("scaleValue") as string;
    const scaleUnit = formData.get("scaleUnit") as string;
    const notes = formData.get("notes") as string;
    const materials = formData.get("materials") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // Build scale reference string
    const scaleRef = scaleValue
      ? `${scaleValue} ${scaleUnit || "m"}`
      : "Non fournie";

    // Fetch Custom Materials from Database to inject into Prompt
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let customMaterialsText = "Aucun matériau personnalisé enregistré.";
    if (user) {
      const { data: customMats } = await supabase
        .from("custom_materials")
        .select("name, unit, default_price")
        .eq("user_id", user.id);

      if (customMats && customMats.length > 0) {
        customMaterialsText = customMats.map(m => `- ${m.name} : ${m.default_price} € HT / ${m.unit}`).join('\n');
      }
    }

    // Build the system prompt
    const systemPrompt = `Agis comme un Économiste de la construction expert et Mètreur professionnel. Analyse ce plan architectural. Utilise l'échelle de référence fournie (${scaleRef}) et prends en compte les notes du client (${notes || "Aucune note additionnelle"}). Le projet concerne le client "${clientName || "Non spécifié"}" à "${city || "Ville non spécifiée"}", projet "${projectName || "Non nommé"}". Les matériaux dominants suggérés initialement sont : ${materials || "Non spécifiés"}. TVA applicable : ${tva || "20"}%.

CRITIQUE ET OBLIGATOIRE CONCERNANT LES MATÉRIAUX :
**Voici la base de données stricte des fournitures et prix officiels (en HT) de cet architecte :**
${customMaterialsText}

RÈGLE DES MATÉRIAUX : LORSQUE TU EXTRAIS LES LOTS DE TRAVAUX DE CE PLAN, TU DOIS ABSOLUMENT ET EN PRIORITÉ MAXIMALE UTILISER LES NOMS (designation), LES UNITÉS (unite) ET LES PRIX UNITAIRES (prix_unitaire_ht) ISSUS DE SA BASE OFFICIELLE CI-DESSUS s'ils correspondent aux éléments identifiés.

RÈGLE DE CHRONOLOGIE ET PRIX :
Génère une liste détaillée de lots de travaux basée sur ton analyse visuelle du plan en STRUCURANT OBLIGATOIREMENT L'ORDRE CHRONOLOGIQUE DES TRAVAUX de cette exacte manière (Ne crée pas de sous-tableaux, ordonne simplement la liste JSON globale) :
1. Installation de chantier
2. Démolition / Dépose
3. Gros œuvre (Maçonnerie, fondations, charpente...)
4. Second œuvre (Plâtrerie, Isolation, Électricité, Plomberie, Menuiserie...)
5. Finitions (Peinture, Revêtements de sol...)

Génère des prix unitaires (PU HT) cohérents avec le marché professionnel de la construction européen actuel, en ajustant bien selon les "Notes" fournies par l'utilisateur.

Renvoie UNIQUEMENT un objet JSON strict contenant :
{
  "lots": [
    {
      "designation": "string (nom clair du lot de travaux)",
      "quantite": (number, estimation précise),
      "unite": "string (m², ml, u, forfait...)",
      "prix_unitaire_ht": (number, prix au marché OU prix de la BDD officielle)
    }
  ],
  "ai_confidence_score": (int entre 0 et 100, la clarté du plan)
}

Ne renvoie AUCUN texte supplémentaire, AUCUN markdown, UNIQUEMENT l'objet JSON valide.`;

    // Convert file to base64 for Gemini vision
    const fileBytes = await file.arrayBuffer();
    const base64Data = Buffer.from(fileBytes).toString("base64");

    // Determine MIME type
    const mimeType = file.type || "image/png";

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    // Send to Gemini with vision
    const result = await model.generateContent([
      { text: systemPrompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON from response (strip potential markdown code fences)
    const cleanedText = responseText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let analysisResult;
    try {
      analysisResult = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        {
          error: "L'IA n'a pas retourné un JSON valide.",
          rawResponse: responseText,
        },
        { status: 422 }
      );
    }

    // Validate expected fields
    if (!analysisResult.lots || !Array.isArray(analysisResult.lots)) {
      analysisResult.lots = [];
    }
    if (!("ai_confidence_score" in analysisResult)) {
      analysisResult.ai_confidence_score = 0;
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      meta: {
        clientName,
        city,
        projectName,
        tva,
        scaleRef,
        materials: materials ? JSON.parse(materials) : [],
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "Le serveur d'analyse est actuellement surchargé. Veuillez patienter une minute avant de relancer le chiffrage." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
