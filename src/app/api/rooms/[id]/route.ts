import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/google-sheets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await getRoomById(id);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Parse amenities string to array
    const roomWithParsedAmenities = {
      ...room,
      amenities: room.amenities ? room.amenities.split(',').map(a => a.trim()) : []
    };

    return NextResponse.json(roomWithParsedAmenities);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}
