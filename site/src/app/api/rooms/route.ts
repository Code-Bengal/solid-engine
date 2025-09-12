import { NextRequest, NextResponse } from 'next/server';
import { getRoomsFromSheets, getRoomById } from '@/lib/google-sheets';

// GET /api/rooms - Get all rooms
export async function GET() {
  try {
    const rooms = await getRoomsFromSheets();

    // Parse amenities string to array
    const roomsWithParsedAmenities = rooms.map(room => ({
      ...room,
      amenities: room.amenities ? room.amenities.split(',').map(a => a.trim()) : []
    }));

    return NextResponse.json(roomsWithParsedAmenities);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// GET /api/rooms/[id] - Get room by ID
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const room = await getRoomById(params.id);

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
