-- Allow users to delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own breakthroughs
CREATE POLICY "Users can delete own breakthroughs"
ON public.breakthroughs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own breakthroughs
CREATE POLICY "Users can update own breakthroughs"
ON public.breakthroughs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);