import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../models/user';

interface UserState {
  currentUser: string | null;
  allUsers: User[];
}

const initialState: UserState = {
  currentUser: null,
  allUsers: []
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<string>) => {
      state.currentUser = action.payload;
    },
    setAllUsers: (state, action: PayloadAction<User[]>) => {
      state.allUsers = action.payload;
    },
    clearUser: (state) => {
      state.currentUser = null;
    }
  }
});

export const { setUser, setAllUsers, clearUser } = userSlice.actions;

export default userSlice.reducer;