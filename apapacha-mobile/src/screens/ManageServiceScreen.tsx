import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { getMySpace, upsertMySpace } from '../services/spaces.service';
import { getMyVisiter, upsertMyVisiter } from '../services/visiters.service';
import type { Space, Visiter } from '../types/database';

type Route = RouteProp<RootStackParamList, 'ManageService'>;

const SPACE_FEATURES = [
  'Mallas certificadas', 'Sin otros animales', 'Rascadores', 'Comederos inclinados',
  'Zona de juego', 'Balcón seguro', 'Sin niños', 'Área exclusiva para gato',
  'Cámara de vigilancia', 'Aire acondicionado', 'Repisa aérea',
];

export function ManageServiceScreen() {
  const navigation = useNavigation();
  const { type } = useRoute<Route>().params;
  const isSpace = type === 'space';

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [existingId, setExistingId] = useState<string | undefined>();

  // Space fields
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [location, setLocation] = useState('');
  const [priceNight, setPriceNight] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  // Visiter fields
  const [name, setName]         = useState('');
  const [profTitle, setProfTitle] = useState('');
  const [bio, setBio]           = useState('');
  const [priceVisit, setPriceVisit] = useState('');

  // Shared
  const [active, setActive]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (isSpace) {
          const s = await getMySpace();
          if (s) {
            setExistingId(s.id);
            setTitle(s.title);
            setDesc(s.description);
            setLocation(s.location);
            setPriceNight(String(s.price_per_night));
            setFeatures(s.features ?? []);
            setActive(s.active);
          }
        } else {
          const v = await getMyVisiter();
          if (v) {
            setExistingId(v.id);
            setName(v.name);
            setProfTitle(v.profession_title);
            setBio(v.bio);
            setPriceVisit(String(v.price_per_visit));
            setActive(v.active);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleFeature = (f: string) => {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleSave = async () => {
    if (isSpace) {
      if (!title.trim() || !desc.trim() || !location.trim() || !priceNight) {
        Alert.alert('Campos requeridos', 'Completa título, descripción, ubicación y precio.');
        return;
      }
    } else {
      if (!name.trim() || !profTitle.trim() || !bio.trim() || !priceVisit) {
        Alert.alert('Campos requeridos', 'Completa nombre, título profesional, descripción y precio.');
        return;
      }
    }
    setSaving(true);
    try {
      if (isSpace) {
        await upsertMySpace({
          id: existingId,
          title: title.trim(),
          description: desc.trim(),
          location: location.trim(),
          price_per_night: Number(priceNight),
          features,
          active,
        });
      } else {
        await upsertMyVisiter({
          id: existingId,
          name: name.trim(),
          profession_title: profTitle.trim(),
          bio: bio.trim(),
          price_per_visit: Number(priceVisit),
          active,
        });
      }
      Alert.alert(
        existingId ? '¡Actualizado!' : '¡Publicación creada!',
        existingId ? 'Tu servicio fue actualizado.' : 'Tu servicio ya está visible en Explorar.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingId ? 'Editar' : 'Crear'} {isSpace ? 'Alojamiento' : 'Visita domiciliaria'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isSpace ? <SpaceForm
            title={title} setTitle={setTitle}
            desc={desc} setDesc={setDesc}
            location={location} setLocation={setLocation}
            priceNight={priceNight} setPriceNight={setPriceNight}
            features={features} toggleFeature={toggleFeature}
          /> : <VisiterForm
            name={name} setName={setName}
            profTitle={profTitle} setProfTitle={setProfTitle}
            bio={bio} setBio={setBio}
            priceVisit={priceVisit} setPriceVisit={setPriceVisit}
          />}

          {/* Active toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Publicación activa</Text>
              <Text style={styles.toggleSub}>Visible para clientes en Explorar</Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.saveBtnText}>{existingId ? 'Guardar cambios' : 'Publicar servicio'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SpaceForm({ title, setTitle, desc, setDesc, location, setLocation, priceNight, setPriceNight, features, toggleFeature }: {
  title: string; setTitle: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  priceNight: string; setPriceNight: (v: string) => void;
  features: string[]; toggleFeature: (f: string) => void;
}) {
  return (
    <>
      <Text style={styles.serviceTypeBadge}>🏠 Alojamiento catificado</Text>

      <Text style={styles.label}>Título de la publicación *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Depto catificado con mallas en Providencia"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Descripción *</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={desc}
        onChangeText={setDesc}
        placeholder="Describe tu espacio, condiciones, cómo cuidas a los gatos..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Ubicación / Sector *</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Ej: Providencia, Santiago"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Precio por noche (CLP) *</Text>
      <TextInput
        style={styles.input}
        value={priceNight}
        onChangeText={v => setPriceNight(v.replace(/\D/g, ''))}
        placeholder="Ej: 15000"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
      />
      {priceNight ? (
        <Text style={styles.priceHint}>${Number(priceNight).toLocaleString('es-CL')} / noche</Text>
      ) : null}

      <Text style={styles.label}>Características del espacio</Text>
      <Text style={styles.sublabel}>Selecciona todo lo que aplica</Text>
      <View style={styles.featuresGrid}>
        {SPACE_FEATURES.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.featureChip, features.includes(f) && styles.featureChipActive]}
            onPress={() => toggleFeature(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.featureChipText, features.includes(f) && styles.featureChipTextActive]}>
              {features.includes(f) ? '✓ ' : ''}{f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

function VisiterForm({ name, setName, profTitle, setProfTitle, bio, setBio, priceVisit, setPriceVisit }: {
  name: string; setName: (v: string) => void;
  profTitle: string; setProfTitle: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  priceVisit: string; setPriceVisit: (v: string) => void;
}) {
  return (
    <>
      <Text style={styles.serviceTypeBadge}>🚗 Visita domiciliaria</Text>

      <Text style={styles.label}>Tu nombre como cuidador *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ej: María González"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Título profesional *</Text>
      <TextInput
        style={styles.input}
        value={profTitle}
        onChangeText={setProfTitle}
        placeholder="Ej: Técnico Veterinario, Cuidador certificado"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Sobre ti y tu servicio *</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Cuéntanos sobre tu experiencia con gatos, cómo es tu visita, qué incluye..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Precio por visita (CLP) *</Text>
      <TextInput
        style={styles.input}
        value={priceVisit}
        onChangeText={v => setPriceVisit(v.replace(/\D/g, ''))}
        placeholder="Ej: 8000"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
      />
      {priceVisit ? (
        <Text style={styles.priceHint}>${Number(priceVisit).toLocaleString('es-CL')} / visita</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textMain },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  serviceTypeBadge: { alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 6, marginTop: 16 },
  sublabel: { fontSize: 12, color: colors.textMuted, marginBottom: 10, marginTop: -4 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 14, color: colors.textMain },
  textarea: { height: 110, textAlignVertical: 'top' },
  priceHint: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 6 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  featureChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  featureChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  featureChipTextActive: { color: colors.primaryDark, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 24 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  toggleSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { backgroundColor: colors.surface, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
});
