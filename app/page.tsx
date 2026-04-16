"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Trash2, Edit3, Search, LogOut, FileText, Upload } from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [prenotazioni, setPrenotazioni] = useState<any[]>([]);
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dataStart, setDataStart] = useState("");
  const [dataEnd, setDataEnd] = useState("");
  const [selectedPaziente, setSelectedPaziente] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    id: null, nome: '', cognome: '', telefono: '', medico: '', trattamento: '', 
    data_ora: '', prezzo: 0, stato_pagamento: 'Da saldare' 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) caricaDati();
      setLoading(false);
    });
  }, []);

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Accesso negato");
    else window.location.reload();
  }

  async function caricaDati() {
    const { data } = await supabase.from('appuntamenti').select('*').order('data_ora', { ascending: false });
    setPrenotazioni(data || []);
  }

  async function apriCartella(p: any) {
    setSelectedPaziente(p);
    const { data } = await supabase.from('documenti_pazienti').select('*').eq('paziente_id', p.id);
    setDocumenti(data || []);
  }

  async function uploadFile(e: any) {
    if (!selectedPaziente) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const filePath = `${selectedPaziente.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('cartelle_pazienti').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('cartelle_pazienti').getPublicUrl(filePath);
      await supabase.from('documenti_pazienti').insert([{ nome_file: file.name, url_file: publicUrl, paziente_id: selectedPaziente.id }]);
      apriCartella(selectedPaziente);
    } catch (error: any) { alert("Errore: " + error.message); }
    finally { setUploading(false); }
  }

  function controllaSovrapposizione(dataOra: string) {
    const nuovaData = new Date(dataOra).getTime();
    return prenotazioni.some(p => {
      const dataEsistente = new Date(p.data_ora).getTime();
      return Math.abs(nuovaData - dataEsistente) < 30 * 60 * 1000;
    });
  }

  async function salvaPrenotazione() {
    if (!formData.nome || !formData.data_ora) return alert("Compila i campi obbligatori");
    if (controllaSovrapposizione(formData.data_ora) && !formData.id) {
      if (!confirm("Attenzione: esiste già una prenotazione in questa fascia. Procedere?")) return;
    }
    if (formData.id) {
      await supabase.from('appuntamenti').update(formData).eq('id', formData.id);
    } else {
      const { id, ...payload } = formData;
      await supabase.from('appuntamenti').insert([payload]);
    }
    setFormData({ id: null, nome: '', cognome: '', telefono: '', medico: '', trattamento: '', data_ora: '', prezzo: 0, stato_pagamento: 'Da saldare' });
    caricaDati();
  }

  async function elimina(id: number) {
    if (confirm("Eliminare questa prenotazione?")) {
      await supabase.from('appuntamenti').delete().eq('id', id);
      caricaDati();
    }
  }

  const datiFiltrati = prenotazioni.filter((p) => {
    const match = `${p.nome} ${p.cognome}`.toLowerCase().includes(search.toLowerCase());
    const dataApp = new Date(p.data_ora).getTime();
    const inizio = dataStart ? new Date(dataStart).getTime() : 0;
    const fine = dataEnd ? new Date(dataEnd).getTime() : Infinity;
    return match && dataApp >= inizio && dataApp <= fine;
  });

  if (loading) return <div className="p-10 text-center font-bold">CARICAMENTO TWS...</div>;

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-96 shadow-xl">
        <CardHeader className="text-center">
          {/* LOGO INSERITO QUI */}
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">BARTOLACCI TWS</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full bg-blue-600 font-bold" onClick={handleLogin}>ACCEDI</Button>
        </CardContent>
      </Card>
    </div>
  );


  return (
    <main className="p-6 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          {/* LOGO E TITOLO INSERITI QUI */}
          <div className="flex items-center gap-3">
             <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
             <h1 className="text-3xl font-black italic uppercase">Bartolacci <span className="text-blue-600">TWS</span></h1>
          </div>
          <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => window.location.reload())}>
            <LogOut className="mr-2 h-4 w-4" /> Esci
          </Button>
        </div>
        
        <Card className="mb-6 shadow-sm border-l-4 border-l-blue-600">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input type="datetime-local" value={formData.data_ora} onChange={(e) => setFormData({...formData, data_ora: e.target.value})} />
            <Input placeholder="Nome" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            <Input placeholder="Cognome" value={formData.cognome} onChange={(e) => setFormData({...formData, cognome: e.target.value})} />
            <Input placeholder="Telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            <Input placeholder="Medico" value={formData.medico} onChange={(e) => setFormData({...formData, medico: e.target.value})} />
            <Input placeholder="Trattamento" value={formData.trattamento} onChange={(e) => setFormData({...formData, trattamento: e.target.value})} />
            <Input type="number" placeholder="Prezzo (€)" value={formData.prezzo} onChange={(e) => setFormData({...formData, prezzo: Number(e.target.value)})} />
            <select className="flex h-10 w-full rounded-md border border-slate-300 px-3 bg-white" value={formData.stato_pagamento} onChange={(e) => setFormData({...formData, stato_pagamento: e.target.value})}>
                <option value="Da saldare">Da saldare</option><option value="Acconto">Acconto</option><option value="Saldato">Saldato</option>
            </select>
            <Button onClick={salvaPrenotazione} className="bg-blue-600 text-white font-bold uppercase">{formData.id ? "Aggiorna" : "Salva in Agenda"}</Button>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input type="datetime-local" onChange={(e) => setDataStart(e.target.value)} />
            <Input type="datetime-local" onChange={(e) => setDataEnd(e.target.value)} />
            <div className="relative w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input className="pl-10" placeholder="Cerca nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
        </div>

        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>DATA</TableHead><TableHead>PAZIENTE</TableHead><TableHead>TEL</TableHead><TableHead>MEDICO</TableHead><TableHead>TRATTAMENTO</TableHead><TableHead>STATO</TableHead><TableHead>PREZZO</TableHead><TableHead>AZIONI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datiFiltrati.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.data_ora).toLocaleString('it-IT')}</TableCell>
                  <TableCell className="font-bold uppercase">{p.nome} {p.cognome}</TableCell>
                  <TableCell>{p.telefono}</TableCell>
                  <TableCell>{p.medico}</TableCell>
                  <TableCell>{p.trattamento}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded text-[10px] font-bold ${p.stato_pagamento === 'Saldato' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.stato_pagamento}</span></TableCell>
                  <TableCell className="font-bold">€{p.prezzo}</TableCell>
                  <TableCell className="flex gap-1">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => apriCartella(p)} title="Cartella Clinica">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[540px]">
                        <SheetHeader><SheetTitle className="font-black uppercase">Cartella: {p.nome} {p.cognome}</SheetTitle></SheetHeader>
                        <div className="mt-8 space-y-6">
                          <div className="p-4 border-2 border-dashed rounded-lg bg-slate-50 text-center">
                            <label className="cursor-pointer block">
                              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2"/>
                              <span className="text-sm font-medium">{uploading ? "Caricamento..." : "Carica Referto/Foto"}</span>
                              <input type="file" className="hidden" onChange={uploadFile} disabled={uploading}/>
                            </label>
                          </div>
                          <div>
                            <h3 className="font-bold mb-3 flex items-center text-sm uppercase">Documenti Allegati</h3>
                            <div className="space-y-2">
                              {documenti.map(d => (
                                <a key={d.id} href={d.url_file} target="_blank" className="p-3 bg-white border rounded flex justify-between items-center hover:bg-blue-50 transition-colors">
                                  <span className="text-xs truncate font-medium">{d.nome_file}</span>
                                  <Button size="xs" variant="link" className="text-blue-600 h-auto p-0">Apri</Button>
                                </a>
                              ))}
                              {documenti.length === 0 && <p className="text-xs text-slate-400 italic">Nessun documento caricato.</p>}
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Button variant="ghost" size="sm" onClick={() => setFormData(p)}><Edit3 className="h-4 w-4 text-orange-500" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => elimina(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
