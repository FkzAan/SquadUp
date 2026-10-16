import { Image, StyleSheet, Text, View } from 'react-native';

type Props = {
    uri?: string | null;
    name: string;
    size?: number;
};

export default function Avatar({ uri, name, size = 48 }: Props) {
    const radius = size / 2;

    if (uri) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#e5e7eb' }} />;
    }

    return (
        <View style={[s.fallback, { width: size, height: size, borderRadius: radius }]}>
            <Text style={[s.initial, { fontSize: size * 0.42 }]}>{(name || '?').charAt(0).toUpperCase()}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    fallback: { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    initial: { color: '#1d4ed8', fontWeight: '800' },
});