import { Feather } from "@expo/vector-icons";
import { useListSessions } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface InferResult {
  weight: number;
  confidence: number;
  category: string;
  tags: string[];
  reasoning: string;
  pathLabel: string;
  nodes: string[];
  adaptationDelta: number;
}

const PHASE_LABELS: Record<string, string> = {
  analyzing: "Analyzing",
  routing: "Routing",
};

const CATEGORY_COLORS: Record<string, string> = {
  behavioral: "#0dd4f0",
  semantic: "#7e47eb",
  temporal: "#0080ff",
  contextual: "#10b981",
};

export default function InferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [result, setResult] = useState<InferResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sessions } = useListSessions();
  const activeSessions = (sessions ?? []).filter(
    (s) => s.status === "active"
  );

  const topPad = Platform.OS === "web" ? 67 : 0;

  const runInference = async () => {
    if (!input.trim() || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsStreaming(true);
    setPhase("analyzing");
    setResult(null);
    setError(null);

    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const url = domain
      ? `https://${domain}/api/infer`
      : "/api/infer";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ input: input.trim(), sessionId }),
      });

      if (!response.ok) {
        throw new Error("Inference request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const partial: Partial<InferResult> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.phase) setPhase(parsed.phase);
            if (parsed.weight !== undefined) {
              partial.weight = parsed.weight;
              partial.confidence = parsed.confidence;
              partial.category = parsed.category;
              partial.tags = parsed.tags ?? [];
              partial.reasoning = parsed.reasoning ?? "";
            }
            if (parsed.label !== undefined) {
              partial.pathLabel = parsed.label;
              partial.nodes = parsed.nodes ?? [];
            }
            if (parsed.adaptationDelta !== undefined) {
              partial.adaptationDelta = parsed.adaptationDelta;
            }
          } catch {}
        }
      }

      setResult({
        weight: partial.weight ?? 0,
        confidence: partial.confidence ?? 0,
        category: partial.category ?? "semantic",
        tags: partial.tags ?? [],
        reasoning: partial.reasoning ?? "",
        pathLabel: partial.pathLabel ?? "",
        nodes: partial.nodes ?? [],
        adaptationDelta: partial.adaptationDelta ?? 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInput("");
    } catch (err: any) {
      setError(err?.message ?? "Inference failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsStreaming(false);
      setPhase(null);
    }
  };

  const catColor = result
    ? (CATEGORY_COLORS[result.category] ?? colors.primary)
    : colors.primary;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPad + 16,
            paddingBottom: 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.foreground }]}>
          Inference
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          AI signal scoring engine
        </Text>

        {activeSessions.length > 0 && (
          <View style={styles.sessionPicker}>
            <Text
              style={[styles.pickerLabel, { color: colors.mutedForeground }]}
            >
              Session context
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionChips}
            >
              <Pressable
                onPress={() => setSessionId(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      sessionId === null ? colors.primary : colors.muted,
                    borderRadius: 99,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        sessionId === null
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  No session
                </Text>
              </Pressable>
              {activeSessions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSessionId(s.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        sessionId === s.id ? colors.primary : colors.muted,
                      borderRadius: 99,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          sessionId === s.id
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {isStreaming && phase && (
          <View
            style={[
              styles.phaseBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary + "44",
                borderRadius: colors.radius,
              },
            ]}
          >
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.phaseText, { color: colors.primary }]}>
              {PHASE_LABELS[phase] ?? phase}…
            </Text>
          </View>
        )}

        {error && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.destructive + "22",
                borderColor: colors.destructive + "44",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        )}

        {result && (
          <View style={styles.resultSection}>
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: colors.card,
                  borderColor: catColor + "44",
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.resultRow}>
                <View>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Category
                  </Text>
                  <Text style={[styles.resultCategory, { color: catColor }]}>
                    {result.category}
                  </Text>
                </View>
                <View style={styles.scores}>
                  <View style={styles.scoreItem}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Weight
                    </Text>
                    <Text
                      style={[styles.scoreValue, { color: colors.foreground }]}
                    >
                      {result.weight.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Confidence
                    </Text>
                    <Text
                      style={[styles.scoreValue, { color: colors.foreground }]}
                    >
                      {result.confidence.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />

              <Text
                style={[styles.reasoningText, { color: colors.foreground }]}
              >
                {result.reasoning}
              </Text>

              {result.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {result.tags.map((tag, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: catColor + "22",
                          borderRadius: 99,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: catColor }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {result.nodes.length > 0 && (
              <View
                style={[
                  styles.pathCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pathLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Suggested Path
                </Text>
                <Text
                  style={[styles.pathTitle, { color: colors.foreground }]}
                >
                  {result.pathLabel}
                </Text>
                {result.nodes.map((node, i) => (
                  <View key={i} style={styles.nodeRow}>
                    <View
                      style={[
                        styles.nodeDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.nodeText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {node}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.foreground,
              borderRadius: colors.radius,
            },
          ]}
          placeholder="Enter signal…"
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={runInference}
        />
        <Pressable
          onPress={() => {
            runInference();
            inputRef.current?.focus();
          }}
          disabled={isStreaming || !input.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor:
                isStreaming || !input.trim()
                  ? colors.muted
                  : colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isStreaming ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Feather
              name="send"
              size={18}
              color={
                !input.trim() ? colors.mutedForeground : colors.primaryForeground
              }
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  heading: { fontSize: 26, fontWeight: "700" as const, marginBottom: 2 },
  sub: { fontSize: 13, marginBottom: 20 },
  sessionPicker: { marginBottom: 16 },
  pickerLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8 },
  sessionChips: { gap: 8, paddingRight: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "500" as const },
  phaseBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  phaseText: { fontSize: 13, fontWeight: "500" as const },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13 },
  resultSection: { gap: 12, marginBottom: 16 },
  resultCard: { padding: 16, borderWidth: 1 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  resultLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4 },
  resultCategory: { fontSize: 18, fontWeight: "700" as const, textTransform: "capitalize" as const },
  scores: { flexDirection: "row", gap: 20 },
  scoreItem: { alignItems: "flex-end" as const },
  scoreLabel: { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  scoreValue: { fontSize: 20, fontWeight: "700" as const },
  divider: { height: 1, marginVertical: 12 },
  reasoningText: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 11 },
  pathCard: { padding: 16, borderWidth: 1 },
  pathLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4 },
  pathTitle: { fontSize: 15, fontWeight: "600" as const, marginBottom: 12 },
  nodeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  nodeDot: { width: 6, height: 6, borderRadius: 3 },
  nodeText: { fontSize: 13, flex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
    textAlignVertical: "top" as const,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
